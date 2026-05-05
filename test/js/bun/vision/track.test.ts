import { describe, expect, test } from "bun:test";

// Multi-frame object tracker. Same-class greedy IoU matching with a
// maxFramesMissed grace window. Pure JS — drives via synthetic
// Detection arrays.

function det(label: string, x: number, y: number, w: number, h: number, score = 0.9) {
  return { label, score, bbox: { x, y, width: w, height: h } };
}

describe("parabun:vision.track — basic matching", () => {
  test("two detections in frame 1 birth two tracks with monotonic ids", async () => {
    const vision = (await import("parabun:vision")).default;
    const tk = vision.track();
    const r = tk.step([det("person", 10, 10, 50, 100), det("car", 200, 50, 80, 60)]);
    expect(r.map(t => t.id).sort()).toEqual([1, 2]);
    expect(r.map(t => t.label).sort()).toEqual(["car", "person"]);
  });

  test("ids persist across frames when the bbox stays within IoU threshold", async () => {
    const vision = (await import("parabun:vision")).default;
    const tk = vision.track();
    tk.step([det("person", 10, 10, 50, 100), det("person", 200, 50, 50, 100)]);
    const r = tk.step([
      det("person", 12, 12, 50, 100), // small drift — high IoU with id 1
      det("person", 205, 55, 50, 100), // small drift — high IoU with id 2
    ]);
    expect(r.map(t => t.id).sort()).toEqual([1, 2]);
    // Same ids → same labels, hits should advance.
    for (const t of r) {
      expect(t.hits).toBe(2);
      expect(t.framesSinceLastHit).toBe(0);
    }
  });

  test("a fully-disjoint new bbox births a fresh id (no spurious match)", async () => {
    const vision = (await import("parabun:vision")).default;
    const tk = vision.track();
    tk.step([det("person", 10, 10, 50, 100)]);
    const r = tk.step([
      det("person", 10, 10, 50, 100), // matches id 1
      det("person", 800, 600, 50, 100), // far away → new track
    ]);
    expect(r.map(t => t.id).sort()).toEqual([1, 2]);
  });

  test("cross-class detections never merge (label gating)", async () => {
    const vision = (await import("parabun:vision")).default;
    const tk = vision.track();
    tk.step([det("person", 10, 10, 50, 100)]);
    // Same exact bbox but a different label — must not match.
    const r = tk.step([det("car", 10, 10, 50, 100)]);
    // The person is now coasting (id 1, framesSinceLastHit=1, not in
    // active list); the car is a fresh id 2 in active list.
    expect(r.map(t => t.id)).toEqual([2]);
    expect(r[0].label).toBe("car");
    // Person still tracked but inactive.
    const all = tk.tracks;
    expect(all.find(t => t.id === 1)?.framesSinceLastHit).toBe(1);
  });
});

describe("parabun:vision.track — coasting + expiry", () => {
  test("a missed detection coasts within maxFramesMissed and re-attaches when the object reappears", async () => {
    const vision = (await import("parabun:vision")).default;
    const tk = vision.track({ maxFramesMissed: 5 });
    tk.step([det("person", 10, 10, 50, 100), det("person", 200, 50, 50, 100)]);
    tk.step([det("person", 12, 12, 50, 100), det("person", 205, 55, 50, 100)]);
    // Frame 3: id 2 absent (occluded) — only id 1 is active.
    const r3 = tk.step([det("person", 14, 14, 50, 100)]);
    expect(r3.map(t => t.id)).toEqual([1]);
    expect(tk.tracks.find(t => t.id === 2)?.framesSinceLastHit).toBe(1);
    // Frame 4: id 2 reappears in its old position → re-attaches.
    const r4 = tk.step([det("person", 16, 16, 50, 100), det("person", 207, 57, 50, 100)]);
    expect(r4.map(t => t.id).sort()).toEqual([1, 2]);
  });

  test("coasting beyond maxFramesMissed drops the track", async () => {
    const vision = (await import("parabun:vision")).default;
    const tk = vision.track({ maxFramesMissed: 2 });
    tk.step([det("person", 10, 10, 50, 100)]);
    tk.step([]); // miss 1
    tk.step([]); // miss 2 — still alive (== threshold)
    expect(tk.tracks.find(t => t.id === 1)).toBeDefined();
    tk.step([]); // miss 3 — dropped
    expect(tk.tracks.find(t => t.id === 1)).toBeUndefined();
  });

  test("a brand new detection during a coasting gap births a new id, not a stale match", async () => {
    const vision = (await import("parabun:vision")).default;
    const tk = vision.track({ maxFramesMissed: 5 });
    tk.step([det("person", 10, 10, 50, 100)]); // id 1
    tk.step([]); // id 1 coasting
    // Reappear in a totally different location — no IoU → new id 2.
    const r = tk.step([det("person", 800, 600, 50, 100)]);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(2);
  });
});

describe("parabun:vision.track — trajectory + reset", () => {
  test("trajectoryLength=0 (default) keeps the per-track history empty", async () => {
    const vision = (await import("parabun:vision")).default;
    const tk = vision.track();
    tk.step([det("person", 10, 10, 50, 100)]);
    tk.step([det("person", 12, 12, 50, 100)]);
    expect(tk.tracks[0].trajectory).toEqual([]);
  });

  test("trajectoryLength=N retains the last N bboxes per track", async () => {
    const vision = (await import("parabun:vision")).default;
    const tk = vision.track({ trajectoryLength: 3 });
    tk.step([det("person", 10, 10, 50, 100)]);
    tk.step([det("person", 12, 12, 50, 100)]);
    tk.step([det("person", 14, 14, 50, 100)]);
    tk.step([det("person", 16, 16, 50, 100)]);
    const t = tk.tracks[0];
    expect(t.trajectory).toHaveLength(3);
    // Oldest popped — the trajectory should hold the last three positions.
    expect(t.trajectory[0]).toEqual({ x: 12, y: 12, width: 50, height: 100 });
    expect(t.trajectory[2]).toEqual({ x: 16, y: 16, width: 50, height: 100 });
  });

  test("reset() clears tracks and rewinds the id counter", async () => {
    const vision = (await import("parabun:vision")).default;
    const tk = vision.track();
    tk.step([det("person", 10, 10, 50, 100), det("car", 200, 50, 80, 60)]);
    expect(tk.tracks).toHaveLength(2);
    tk.reset();
    expect(tk.tracks).toHaveLength(0);
    const r = tk.step([det("person", 10, 10, 50, 100)]);
    expect(r[0].id).toBe(1); // counter rewound
  });
});

describe("parabun:vision.track — greedy assignment", () => {
  test("when one track could match two detections, the higher-IoU pair wins", async () => {
    const vision = (await import("parabun:vision")).default;
    const tk = vision.track({ iouThreshold: 0.1 });
    // Frame 1: one track at (10, 10) sized 100×100.
    tk.step([det("person", 10, 10, 100, 100)]);
    // Frame 2: two candidate detections — one is a near-perfect overlap,
    // the other is a barely-touching corner. Greedy picks the better
    // one for id 1; the worse one births id 2.
    const r = tk.step([
      det("person", 11, 11, 100, 100), // near-perfect overlap with id 1
      det("person", 90, 90, 100, 100), // barely touches the corner of id 1
    ]);
    expect(r).toHaveLength(2);
    const sorted = [...r].sort((a, b) => a.id - b.id);
    // id 1 keeps the high-IoU match.
    expect(sorted[0].id).toBe(1);
    expect(sorted[0].bbox).toEqual({ x: 11, y: 11, width: 100, height: 100 });
    // The corner detection births a new id.
    expect(sorted[1].id).toBe(2);
  });
});
