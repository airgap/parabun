import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Component($$renderer) {
	let queue = [];
	let inited = false;

	function push(value) {
		const deferred = Promise.withResolvers();

		queue.push({ deferred, value });

		if (!inited) {
			inited = true;
			shift();
		}

		return deferred.promise;
	}

	function shift() {
		const next = queue.shift();

		next?.deferred.resolve(next.value);
	}

	let n = 0;
	var current;
	var $$promises = $$renderer.run([async () => current = await $.async_derived(() => push(n))]);

	$$renderer.push(`<button>shift</button> <button>increment</button> <p>`);
	$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(n)));
	$$renderer.push(`: `);
	$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(Math.min(current(), 3))));
	$$renderer.push(`</p>`);
}