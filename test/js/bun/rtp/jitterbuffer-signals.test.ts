import { describe, expect, test } from "bun:test";

// JitterBuffer reactive signals (LYK-744 v1).
//
// Synthetic packet streams — no network, no fixtures. We hand-build
// ParsedPacket-shaped objects that match what rtp.parse would produce.

type ParsedPacket = {
  sequence: number;
  timestamp: number;
  ssrc: number;
  payloadType: number;
  marker: boolean;
  payload: Uint8Array;
};

function p(seq: number, ts = 0): ParsedPacket {
  return {
    sequence: seq,
    timestamp: ts,
    ssrc: 0xdeadbeef,
    payloadType: 96,
    marker: false,
    payload: new Uint8Array(),
  };
}

describe("bun:rtp JitterBuffer signals (LYK-744)", () => {
  test("pendingSignal / lossCountSignal / lossRateSignal are Signal-shaped", async () => {
    const rtp = (await import("bun:rtp")).default;
    const jb = new rtp.JitterBuffer({ maxLag: 5 });
    expect(typeof jb.pendingSignal.get).toBe("function");
    expect(typeof jb.pendingSignal.subscribe).toBe("function");
    expect(typeof jb.pendingSignal.peek).toBe("function");
    expect(typeof jb.lossCountSignal.get).toBe("function");
    expect(typeof jb.lossRateSignal.get).toBe("function");

    expect(jb.pendingSignal.get()).toBe(0);
    expect(jb.lossCountSignal.get()).toBe(0);
    expect(jb.lossRateSignal.get()).toBe(0);
  });

  test("pendingSignal tracks buffer fill via push/pop", async () => {
    const rtp = (await import("bun:rtp")).default;
    const jb = new rtp.JitterBuffer({ maxLag: 10 });

    // First push: seq 100 — buffer holds 1, expected = 100.
    jb.push(p(100));
    expect(jb.pendingSignal.get()).toBe(1);

    jb.push(p(101));
    jb.push(p(102));
    expect(jb.pendingSignal.get()).toBe(3);

    // pop drains in order — pendingSignal drops by 1 per delivered.
    expect(jb.pop()!.sequence).toBe(100);
    expect(jb.pendingSignal.get()).toBe(2);
    expect(jb.pop()!.sequence).toBe(101);
    expect(jb.pop()!.sequence).toBe(102);
    expect(jb.pendingSignal.get()).toBe(0);
  });

  test("lossCountSignal increments when a slot is declared lost", async () => {
    const rtp = (await import("bun:rtp")).default;
    // maxLag=2: once 3 packets ahead of expected sit in the buffer, the
    // missing slot is declared lost.
    const jb = new rtp.JitterBuffer({ maxLag: 2 });

    // Expected starts at 100. Push 100 (in-order).
    jb.push(p(100));
    expect(jb.pop()!.sequence).toBe(100);

    // Now expected is 101. Push 102, 103, 104 — 101 never arrives.
    jb.push(p(102));
    jb.push(p(103));
    jb.push(p(104));
    // Buffer now has 3 packets ahead of 101 (expected) → over maxLag,
    // pop should declare 101 lost and skip to 102.
    expect(jb.pop()!.sequence).toBe(102);
    expect(jb.lossCountSignal.get()).toBe(1);
  });

  test("lossRateSignal tracks loss / (loss + delivered) lifetime ratio", async () => {
    const rtp = (await import("bun:rtp")).default;
    const jb = new rtp.JitterBuffer({ maxLag: 1 });

    // Deliver 9 in-order.
    for (let i = 0; i < 9; i++) {
      jb.push(p(100 + i));
      jb.pop();
    }
    expect(jb.lossRateSignal.get()).toBe(0);

    // Expected is now 109. Skip 109 entirely; push 110, 111. maxLag=1
    // so two ahead trips loss declaration.
    jb.push(p(110));
    jb.push(p(111));
    expect(jb.pop()!.sequence).toBe(110);
    // 9 in-order delivered + 1 lost + 1 recovered (the pop that just
    // returned 110) = 11 expected. Rate = 1 / 11.
    expect(jb.lossCountSignal.get()).toBe(1);
    expect(Math.abs(jb.lossRateSignal.get() - 1 / 11)).toBeLessThan(1e-9);
  });

  test("subscribers fire on transitions", async () => {
    const rtp = (await import("bun:rtp")).default;
    const jb = new rtp.JitterBuffer({ maxLag: 5 });

    const lossUpdates: number[] = [];
    const unsub = jb.lossCountSignal.subscribe((v: number) => lossUpdates.push(v));

    // No loss yet — only the subscribe-time current-value emit.
    jb.push(p(100));
    jb.pop();
    // Skip 101; push 102..107 (6 ahead of expected 101 with maxLag=5).
    for (let i = 2; i < 8; i++) jb.push(p(100 + i));
    jb.pop();

    unsub();
    // Initial 0 + the loss-count transition to 1.
    expect(lossUpdates).toContain(0);
    expect(lossUpdates).toContain(1);
  });
});
