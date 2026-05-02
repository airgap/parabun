# @para/signals

Reactive primitives — `signal`, `derived`, `effect`, `batch`, `untrack`. Pure JS, runs on any JS runtime (Node, Bun, Deno, browsers, Cloudflare Workers).

This is the runtime side of Para's reactive system. The `.pts` syntax sugar (`signal x = 0`, `effect { … }`, `~>`, `->`) compiles to imports from this package. Other modules in the `para:*` suite (`para:audio`, `para:gpio`, `parabun:llm`, etc.) expose their state as signals so reactive composition is uniform across the suite.

```js
import { signal, derived, effect } from "@para/signals";

const count = signal(0);
const doubled = derived(() => count.get() * 2);

effect(() => console.log(count.get(), doubled.get())); // 0, 0

count.set(1); // logs: 1, 2
count.update(n => n + 1); // logs: 2, 4
```

## API

- **`signal(initial)`** — writable cell. Reads inside an effect register a dep; writes mark deps dirty and schedule a flush.
- **`derived(fn)`** — lazy memoized computation. Re-runs when its deps change. Re-subscribes to its dynamic dep set on each evaluation.
- **`effect(fn)`** — imperative subscriber. Re-runs when any dep it read changes. Returns a disposer.
- **`batch(fn)`** — coalesce writes inside `fn` into a single flush.
- **`untrack(fn)`** — read inside a tracked context without registering a dep.

Effects are drained synchronously via a re-entrant guard, so `signal.set()` inside an effect appends to the queue rather than recursing.

## Status

`private:true / 0.0.0-dev` — pending the workspace split that this package is part of. See [parabun.script.dev](https://parabun.script.dev) for the runtime-bundled story today.
