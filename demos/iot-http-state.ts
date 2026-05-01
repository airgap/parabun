// Live GPIO state over HTTP — `parabun:gpio` + `Bun.serve` + signals. (TypeScript form.)
//
//   bun run build:release demos/iot-http-state.ts [--port 3000]
//
// Same demo as iot-http-state.pts; `signal X = Y` becomes
// `signals.signal(Y)` and `effect { ... }` becomes
// `signals.effect(() => { ... })`. Identical behavior.

import gpio from "parabun:gpio";
import signals from "para:signals";

const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const port = portIdx >= 0 ? Number(args[portIdx + 1]) : 3000;

const chips = gpio.chips();
const rp1 = chips.find(c => c.label === "pinctrl-rp1");
const chipPath = process.env.GPIO_CHIP ?? rp1?.path ?? chips[0]?.path;
if (!chipPath) {
  console.error("no /dev/gpiochip* found.");
  process.exit(1);
}

await using chip = gpio.open(chipPath);
await using button = chip.line(27, { mode: "in", pull: "up", pollHz: 50 });
await using led = chip.line(17, { mode: "out", initial: 0 });

// `ledOverride` is null in auto-mode; setting it forces the LED until cleared.
const ledOverride = signals.signal<0 | 1 | null>(null);

// SSE clients keep a writer per connection. The effect broadcasts to all.
const sseClients = new Set<(payload: string) => void>();

signals.effect(() => {
  const pressed = button.value.get() === 0;
  const override = ledOverride.get();
  const value: 0 | 1 = override !== null ? override : pressed ? 1 : 0;
  led.write(value);

  // Push state to SSE subscribers.
  const payload = JSON.stringify({
    button: button.value.get(),
    led: value,
    override,
  });
  for (const send of sseClients) send(payload);
});

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/state" && req.method === "GET") {
      return Response.json({
        button: button.value.get(),
        led: led.value.get(),
        override: ledOverride.get(),
      });
    }

    if (url.pathname === "/events" && req.method === "GET") {
      const stream = new ReadableStream({
        start(controller) {
          const send = (payload: string) => {
            try {
              controller.enqueue(`data: ${payload}\n\n`);
            } catch {
              // Closed underneath us — drop.
            }
          };
          sseClients.add(send);
          send(
            JSON.stringify({
              button: button.value.get(),
              led: led.value.get(),
              override: ledOverride.get(),
            }),
          );
          req.signal.addEventListener("abort", () => {
            sseClients.delete(send);
            try {
              controller.close();
            } catch {}
          });
        },
      });
      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
      });
    }

    if (url.pathname === "/led/0" && req.method === "POST") {
      ledOverride.set(0);
      return Response.json({ override: 0 });
    }
    if (url.pathname === "/led/1" && req.method === "POST") {
      ledOverride.set(1);
      return Response.json({ override: 1 });
    }
    if (url.pathname === "/led/auto" && req.method === "POST") {
      ledOverride.set(null);
      return Response.json({ override: null });
    }

    return new Response("not found", { status: 404 });
  },
});

console.log(`listening on http://${server.hostname}:${server.port}`);
console.log("");
console.log(`  GET  /state             → current button + LED state`);
console.log(`  GET  /events            → SSE push on every change`);
console.log(`  POST /led/0  /led/1     → manual LED override`);
console.log(`  POST /led/auto          → clear override, follow button`);
console.log("");
console.log("Ctrl-C to stop.");

const stopped = Promise.withResolvers<void>();
const stop = () => stopped.resolve();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
await stopped.promise;
server.stop();
