import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { fork } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = 0;
		let b = 0;
		let c = 0;
		let f;
		const deferred = [];

		function delay(value) {
			if (!value) return value;

			return new Promise((resolve) => deferred.push(() => resolve(value)));
		}

		$$renderer.push(`<p>a `);
		$$renderer.push(async () => $.escape((await $.save(delay(a)))()));
		$$renderer.push(` | b `);
		$$renderer.push(async () => $.escape((await $.save(delay(b)))()));
		$$renderer.push(` | c ${$.escape(c)}</p> <button>a and b (fork)</button> <button>a and c</button> <button>shift</button> <button>pop</button> <button>commit fork</button>`);
	});
}