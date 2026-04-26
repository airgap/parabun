import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

async function runFixture(prefix, source) {
  using dir = tempDir(prefix, { "index.ts": source.trimStart() });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.ts"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("bun:rtp", () => {
  it("packs a minimal packet with the right fixed-header layout", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-pack-minimal",
      `
        import rtp from "bun:rtp";
        const packet = rtp.pack({
          payloadType: 111,            // dynamic / Opus
          sequence: 0x1234,
          timestamp: 0xCAFE0001,
          ssrc: 0xDEADBEEF,
          marker: false,
          payload: new Uint8Array([0xAA, 0xBB, 0xCC]),
        });
        console.log("len", packet.length);                      // 12 + 3
        console.log("byte0", packet[0].toString(16));            // V=2, no flags, CC=0 → 0x80
        console.log("byte1", packet[1].toString(16));            // M=0, PT=111 → 0x6f
        const dv = new DataView(packet.buffer);
        console.log("seq", dv.getUint16(2, false).toString(16));
        console.log("ts", dv.getUint32(4, false).toString(16));
        console.log("ssrc", dv.getUint32(8, false).toString(16));
        console.log("payload", Array.from(packet.subarray(12)).map(b => b.toString(16)).join(","));
      `,
    );
    expect(stdout).toBe(
      ["len 15", "byte0 80", "byte1 6f", "seq 1234", "ts cafe0001", "ssrc deadbeef", "payload aa,bb,cc"].join("\n"),
    );
    expect(exitCode).toBe(0);
  });

  it("sets the M (marker) bit when marker: true", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-marker",
      `
        import rtp from "bun:rtp";
        const packet = rtp.pack({
          payloadType: 96, sequence: 0, timestamp: 0, ssrc: 0,
          marker: true,
          payload: new Uint8Array(0),
        });
        // Byte 1: 0x80 (M=1) | 0x60 (PT=96) = 0xE0
        console.log("byte1", packet[1].toString(16));
      `,
    );
    expect(stdout).toBe("byte1 e0");
    expect(exitCode).toBe(0);
  });

  it("packs CSRC list and parse round-trips them", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-csrc",
      `
        import rtp from "bun:rtp";
        const csrcs = [0x11111111, 0x22222222, 0x33333333];
        const packet = rtp.pack({
          payloadType: 96, sequence: 1, timestamp: 0, ssrc: 0xABCD,
          csrcs,
          payload: new Uint8Array([1, 2, 3]),
        });
        // CC = 3 → byte0 low 4 bits = 3
        console.log("cc", packet[0] & 0x0f);
        // Header now 12 + 3*4 = 24, payload 3 → total 27
        console.log("len", packet.length);
        const parsed = rtp.parse(packet);
        console.log("csrcs", parsed.csrcs.map(c => c.toString(16)).join(","));
        console.log("payload", Array.from(parsed.payload).join(","));
      `,
    );
    expect(stdout).toBe(["cc 3", "len 27", "csrcs 11111111,22222222,33333333", "payload 1,2,3"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("pack → parse round-trip preserves all fields exactly", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-roundtrip",
      `
        import rtp from "bun:rtp";
        const opts = {
          payloadType: 111,
          sequence: 0xBEEF,
          timestamp: 0xDEADBEEF,
          ssrc: 0xFEEDFACE,
          marker: true,
          csrcs: [0x12345678, 0x9ABCDEF0],
          payload: new Uint8Array([0x10, 0x20, 0x30, 0x40, 0x50]),
        };
        const wire = rtp.pack(opts);
        const r = rtp.parse(wire);
        console.log("pt", r.payloadType);
        console.log("seq", r.sequence.toString(16));
        console.log("ts", r.timestamp.toString(16));
        console.log("ssrc", r.ssrc.toString(16));
        console.log("marker", r.marker);
        console.log("csrcs", r.csrcs.map(c => c.toString(16)).join(","));
        console.log("payload", Array.from(r.payload).map(b => b.toString(16)).join(","));
      `,
    );
    expect(stdout).toBe(
      [
        "pt 111",
        "seq beef",
        "ts deadbeef",
        "ssrc feedface",
        "marker true",
        "csrcs 12345678,9abcdef0",
        "payload 10,20,30,40,50",
      ].join("\n"),
    );
    expect(exitCode).toBe(0);
  });

  it("strips RFC 3550 padding from parsed payload", async () => {
    // Hand-build a packet with the P bit set and 3 trailing pad bytes.
    // Last byte = pad count (3); the 3 bytes before the final byte are
    // padding (we use 00s) and shouldn't appear in parsed.payload.
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-padding",
      `
        import rtp from "bun:rtp";
        // Header: V=2, P=1, X=0, CC=0 → 0xA0
        const packet = new Uint8Array(12 + 4 + 3);
        packet[0] = 0xA0;
        packet[1] = 96;
        new DataView(packet.buffer).setUint16(2, 7, false);
        new DataView(packet.buffer).setUint32(4, 1000, false);
        new DataView(packet.buffer).setUint32(8, 0xAA, false);
        // Payload: 4 real bytes
        packet[12] = 0xDE; packet[13] = 0xAD; packet[14] = 0xBE; packet[15] = 0xEF;
        // 3 padding bytes; last byte is the pad count (3)
        packet[16] = 0; packet[17] = 0; packet[18] = 3;
        const parsed = rtp.parse(packet);
        console.log("payload", Array.from(parsed.payload).map(b => b.toString(16)).join(","));
        console.log("padding", parsed.padding);
      `,
    );
    expect(stdout).toBe(["payload de,ad,be,ef", "padding true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("preserves extension header bytes verbatim", async () => {
    // Hand-built packet with X=1 and an empty extension (length = 0 words)
    // — the 4-byte extension prefix still has to round-trip.
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-extension",
      `
        import rtp from "bun:rtp";
        // V=2, P=0, X=1, CC=0 → 0x90
        const packet = new Uint8Array(12 + 4 + 2);
        packet[0] = 0x90;
        packet[1] = 96;
        new DataView(packet.buffer).setUint16(2, 1, false);
        new DataView(packet.buffer).setUint32(4, 0, false);
        new DataView(packet.buffer).setUint32(8, 0, false);
        // Extension: profile-specific=0xBEDE, length=0 (no extension data)
        packet[12] = 0xBE; packet[13] = 0xDE; packet[14] = 0; packet[15] = 0;
        // Payload
        packet[16] = 0xAA; packet[17] = 0xBB;
        const parsed = rtp.parse(packet);
        console.log("ext", parsed.extension);
        console.log("extData", Array.from(parsed.extension_data).map(b => b.toString(16)).join(","));
        console.log("payload", Array.from(parsed.payload).map(b => b.toString(16)).join(","));
      `,
    );
    expect(stdout).toBe(["ext true", "extData be,de,0,0", "payload aa,bb"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects an out-of-range payloadType", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-bad-pt",
      `
        import rtp from "bun:rtp";
        try {
          rtp.pack({ payloadType: 200, sequence: 0, timestamp: 0, ssrc: 0, payload: new Uint8Array(0) });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("7 bits"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("rejects packets shorter than 12 bytes", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-truncated",
      `
        import rtp from "bun:rtp";
        try {
          rtp.parse(new Uint8Array(8));
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("packet too short"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("rejects RTP version != 2", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-bad-version",
      `
        import rtp from "bun:rtp";
        const packet = new Uint8Array(12);
        packet[0] = 0xC0;  // V=3 (top two bits)
        try {
          rtp.parse(packet);
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("version 3"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("JitterBuffer: in-order push → in-order pop", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-jb-inorder",
      `
        import rtp from "bun:rtp";
        const jb = new rtp.JitterBuffer();
        const mkPkt = (seq) => rtp.parse(rtp.pack({
          payloadType: 96, sequence: seq, timestamp: seq * 320, ssrc: 1,
          payload: new Uint8Array([seq]),
        }));
        jb.push(mkPkt(1));
        jb.push(mkPkt(2));
        jb.push(mkPkt(3));
        const popped = [];
        for (let i = 0; i < 4; i++) {
          const p = jb.pop();
          popped.push(p ? p.sequence : "null");
        }
        console.log(popped.join(","));
      `,
    );
    expect(stdout).toBe("1,2,3,null");
    expect(exitCode).toBe(0);
  });

  it("JitterBuffer: out-of-order push reorders on pop", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-jb-reorder",
      `
        import rtp from "bun:rtp";
        const jb = new rtp.JitterBuffer();
        const mkPkt = (seq) => rtp.parse(rtp.pack({
          payloadType: 96, sequence: seq, timestamp: seq * 320, ssrc: 1,
          payload: new Uint8Array(0),
        }));
        // Arrive in 1, 3, 2 order. Pop should return 1, then null (waiting
        // for 2 which hasn't arrived yet — only one packet ahead, well
        // under maxLag), then after 2 arrives pop returns 2 and 3.
        jb.push(mkPkt(1));
        jb.push(mkPkt(3));
        const a = jb.pop()?.sequence;          // 1
        const b = jb.pop();                    // null — waiting for 2
        jb.push(mkPkt(2));
        const c = jb.pop()?.sequence;          // 2
        const d = jb.pop()?.sequence;          // 3
        console.log(\`\${a},\${b === null ? "null" : b.sequence},\${c},\${d}\`);
      `,
    );
    expect(stdout).toBe("1,null,2,3");
    expect(exitCode).toBe(0);
  });

  it("JitterBuffer: lost packet declared after maxLag overflow", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-jb-loss",
      `
        import rtp from "bun:rtp";
        const jb = new rtp.JitterBuffer({ maxLag: 2 });
        const mkPkt = (seq) => rtp.parse(rtp.pack({
          payloadType: 96, sequence: seq, timestamp: seq * 320, ssrc: 1,
          payload: new Uint8Array(0),
        }));
        // Push sequences 1, 3, 4, 5, 6 — sequence 2 never arrives.
        // maxLag = 2 so once we've buffered 3 packets ahead of the
        // expected (2), the missing one gets declared lost.
        jb.push(mkPkt(1));
        const a = jb.pop()?.sequence;          // 1, expected=2
        jb.push(mkPkt(3));
        const b = jb.pop();                    // null (size=1, ≤ maxLag=2)
        jb.push(mkPkt(4));
        const c = jb.pop();                    // null (size=2, ≤ maxLag=2)
        jb.push(mkPkt(5));
        const d = jb.pop()?.sequence;          // 3 (size=3 > 2 → loss declared)
        console.log(
          a,
          b === null ? "null" : b.sequence,
          c === null ? "null" : c.sequence,
          d,
          "loss=" + jb.lossCount,
        );
      `,
    );
    expect(stdout).toBe("1 null null 3 loss=1");
    expect(exitCode).toBe(0);
  });

  it("JitterBuffer: late arrivals (after consumer moved past) are dropped", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-jb-late",
      `
        import rtp from "bun:rtp";
        const jb = new rtp.JitterBuffer();
        const mkPkt = (seq) => rtp.parse(rtp.pack({
          payloadType: 96, sequence: seq, timestamp: seq * 320, ssrc: 1,
          payload: new Uint8Array(0),
        }));
        jb.push(mkPkt(5));
        jb.pop();  // consumes 5; expected becomes 6.
        // Now push 3 (late arrival) and 6 (in order).
        jb.push(mkPkt(3));
        jb.push(mkPkt(6));
        const next = jb.pop();
        console.log("next.seq", next?.sequence ?? "null");
        console.log("pending", jb.pending);  // late 3 was dropped, so 0
      `,
    );
    expect(stdout).toBe(["next.seq 6", "pending 0"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("JitterBuffer: handles 16-bit sequence wrap-around", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-jb-wrap",
      `
        import rtp from "bun:rtp";
        const jb = new rtp.JitterBuffer();
        const mkPkt = (seq) => rtp.parse(rtp.pack({
          payloadType: 96, sequence: seq, timestamp: 0, ssrc: 1,
          payload: new Uint8Array(0),
        }));
        // Cross 65535 → 0 → 1 in order.
        jb.push(mkPkt(65534));
        jb.push(mkPkt(65535));
        jb.push(mkPkt(0));
        jb.push(mkPkt(1));
        const seqs = [];
        for (let i = 0; i < 4; i++) {
          const p = jb.pop();
          if (p) seqs.push(p.sequence);
        }
        console.log(seqs.join(","));
      `,
    );
    expect(stdout).toBe("65534,65535,0,1");
    expect(exitCode).toBe(0);
  });

  it("JitterBuffer: rejects invalid maxLag", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-jb-bad-maxlag",
      `
        import rtp from "bun:rtp";
        try {
          new rtp.JitterBuffer({ maxLag: 0 });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("maxLag must be >= 1"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("voice-pipeline integration: Opus packet → RTP wire → parse → payload matches", async () => {
    // The use case bun:rtp exists for: take an Opus-encoded frame, wrap
    // it in RTP for transport, parse on the receiving end, recover the
    // bytes byte-for-byte.
    const { stdout, exitCode } = await runFixture(
      "parabun-rtp-opus-integration",
      `
        import audio from "bun:audio";
        import rtp from "bun:rtp";

        const enc = new audio.OpusEncoder({ sampleRate: 16000, channels: 1, bitrate: 32000 });
        const samples = new Float32Array(320);
        for (let i = 0; i < 320; i++) samples[i] = 0.4 * Math.sin(i * 0.1);
        const opusPacket = enc.encode(samples, 320);
        enc.close();

        const wire = rtp.pack({
          payloadType: 111,  // Opus dynamic PT in many SDP setups
          sequence: 1,
          timestamp: 320,    // sample count for Opus stream
          ssrc: 0x1234,
          marker: false,
          payload: opusPacket,
        });

        const parsed = rtp.parse(wire);
        const equal = parsed.payload.length === opusPacket.length
          && parsed.payload.every((b, i) => b === opusPacket[i]);
        console.log("payloadEqual", equal);
        console.log("pt", parsed.payloadType);
        console.log("ts", parsed.timestamp);
      `,
    );
    expect(stdout).toBe(["payloadEqual true", "pt 111", "ts 320"].join("\n"));
    expect(exitCode).toBe(0);
  });
});
