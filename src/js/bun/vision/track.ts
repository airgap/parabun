// Hardcoded module "parabun:vision/track" (private to parabun:vision)
//
// Multi-frame object tracker that sits on top of vision.detect. Takes
// per-frame Detection[] and produces stable Track[]: each contiguous
// occurrence of the same object across frames keeps the same `id`, so
// callers can draw consistent labels, accumulate trajectories, route
// effects per-object instead of per-frame.
//
// Algorithm: SORT-style greedy IoU matching with same-label gating.
//
//   for each new frame's detections:
//     1. Build the IoU matrix between active tracks and new detections,
//        masked so cross-class pairs score 0 (people aren't matched
//        against cars).
//     2. Greedy assignment: pick the highest-IoU pair above
//        `iouThreshold`, mark both consumed, repeat until no pair
//        meets the threshold. (Hungarian's optimal but adds ~100 LoC
//        for a small accuracy gain at our scale.)
//     3. Matched tracks update bbox/score/label, bump hits, reset
//        framesSinceLastHit. Unmatched tracks bump
//        framesSinceLastHit.
//     4. Tracks with framesSinceLastHit > maxFramesMissed are removed.
//     5. Each unmatched detection births a new track with a fresh id.
//
// State is per-tracker — for multiple cameras / streams, instantiate
// one Tracker per source.

type Detection = {
  label: string;
  score: number;
  bbox: { x: number; y: number; width: number; height: number };
};

type Track = {
  /** Stable id assigned when the track was first seen. Monotonic. */
  id: number;
  label: string;
  /** Most recent matched bbox in source-frame pixels. */
  bbox: { x: number; y: number; width: number; height: number };
  /** Most recent matched score in [0, 1]. */
  score: number;
  /** Total frames the tracker has seen this id (regardless of hit). */
  age: number;
  /** Frames where this track matched a detection. */
  hits: number;
  /** Frames since last successful match. 0 = matched this frame. */
  framesSinceLastHit: number;
  /**
   * Most recent bboxes in chronological order (oldest first). Length
   * capped at `opts.trajectoryLength`. Empty when trajectoryLength = 0
   * (default — saves the per-frame allocation when nobody asks).
   */
  trajectory: { x: number; y: number; width: number; height: number }[];
};

type TrackOptions = {
  /**
   * Minimum IoU for a detection ↔ track pair to be considered a match.
   * Default 0.3 — balances tolerance to fast motion (low value) with
   * cross-track contamination (high value). Tighten for crowded scenes.
   */
  iouThreshold?: number;
  /**
   * How many frames a track survives without a match before being
   * dropped. Default 5 — at 30 fps that's ~167 ms grace, enough to
   * ride out brief occlusions or dropped detections without yo-yoing
   * track ids when the object reappears.
   */
  maxFramesMissed?: number;
  /**
   * Number of bboxes to retain per track in `trajectory`. Default 0
   * (off — the array stays empty to skip the per-frame push). Set to
   * 30 for "the last second of motion" if drawing trails.
   */
  trajectoryLength?: number;
};

function iou(a: Detection["bbox"], b: Detection["bbox"]): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const interX1 = Math.max(a.x, b.x);
  const interY1 = Math.max(a.y, b.y);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);
  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const inter = interW * interH;
  if (inter === 0) return 0;
  const aArea = a.width * a.height;
  const bArea = b.width * b.height;
  const union = aArea + bArea - inter;
  return union === 0 ? 0 : inter / union;
}

class Tracker {
  #nextId = 1;
  #tracks: Track[] = [];
  #opts: Required<TrackOptions>;
  // Reusable scratch — IoU pairs allocated once per step() call.
  // Re-using across calls would let one bad frame's leftovers leak
  // into the next; cheaper to GC the small per-frame array than to
  // book-keep the cleared state.

  constructor(opts: TrackOptions = {}) {
    this.#opts = {
      iouThreshold: opts.iouThreshold ?? 0.3,
      maxFramesMissed: opts.maxFramesMissed ?? 5,
      trajectoryLength: opts.trajectoryLength ?? 0,
    };
  }

  /**
   * Snapshot of currently-active tracks. Includes both fresh and
   * coasting (within maxFramesMissed) tracks. Use `.activeTracks()`
   * if you only want this-frame matches.
   */
  get tracks(): readonly Track[] {
    return this.#tracks;
  }

  /** Tracks that matched a detection on the most recent step(). */
  activeTracks(): Track[] {
    return this.#tracks.filter(t => t.framesSinceLastHit === 0);
  }

  /**
   * Advance one frame. Pass this frame's detections; receive the
   * updated active tracks. Internally also keeps coasting tracks
   * alive for `maxFramesMissed` frames so brief occlusions don't
   * fragment the id timeline.
   */
  step(detections: Detection[]): Track[] {
    const opts = this.#opts;

    // 1. Build IoU pairs above threshold, same-label only.
    type Pair = { trackIdx: number; detIdx: number; iouVal: number };
    const pairs: Pair[] = [];
    for (let ti = 0; ti < this.#tracks.length; ti++) {
      const t = this.#tracks[ti];
      for (let di = 0; di < detections.length; di++) {
        const d = detections[di];
        if (d.label !== t.label) continue;
        const v = iou(t.bbox, d.bbox);
        if (v >= opts.iouThreshold) pairs.push({ trackIdx: ti, detIdx: di, iouVal: v });
      }
    }

    // 2. Greedy: highest-IoU first; pair consumes both indices.
    pairs.sort((a, b) => b.iouVal - a.iouVal);
    const matchedTracks = new Uint8Array(this.#tracks.length);
    const matchedDets = new Uint8Array(detections.length);
    for (const p of pairs) {
      if (matchedTracks[p.trackIdx] || matchedDets[p.detIdx]) continue;
      matchedTracks[p.trackIdx] = 1;
      matchedDets[p.detIdx] = 1;
      const t = this.#tracks[p.trackIdx];
      const d = detections[p.detIdx];
      t.bbox = { ...d.bbox };
      t.score = d.score;
      t.framesSinceLastHit = 0;
      t.hits++;
      t.age++;
      if (opts.trajectoryLength > 0) {
        t.trajectory.push({ ...d.bbox });
        if (t.trajectory.length > opts.trajectoryLength) t.trajectory.shift();
      }
    }

    // 3. Age unmatched tracks; drop expired.
    for (let ti = 0; ti < this.#tracks.length; ti++) {
      if (matchedTracks[ti]) continue;
      const t = this.#tracks[ti];
      t.framesSinceLastHit++;
      t.age++;
    }
    this.#tracks = this.#tracks.filter(t => t.framesSinceLastHit <= opts.maxFramesMissed);

    // 4. Birth tracks for unmatched detections.
    for (let di = 0; di < detections.length; di++) {
      if (matchedDets[di]) continue;
      const d = detections[di];
      const newTrack: Track = {
        id: this.#nextId++,
        label: d.label,
        bbox: { ...d.bbox },
        score: d.score,
        age: 1,
        hits: 1,
        framesSinceLastHit: 0,
        trajectory: opts.trajectoryLength > 0 ? [{ ...d.bbox }] : [],
      };
      this.#tracks.push(newTrack);
    }

    return this.activeTracks();
  }

  /** Drop all state — useful when the camera scene changes. */
  reset(): void {
    this.#tracks = [];
    this.#nextId = 1;
  }
}

function track(opts: TrackOptions = {}): Tracker {
  return new Tracker(opts);
}

export default {
  track,
  Tracker,
  // Exposed primarily for tests; users with bespoke matchers may want
  // it too.
  iou,
};
