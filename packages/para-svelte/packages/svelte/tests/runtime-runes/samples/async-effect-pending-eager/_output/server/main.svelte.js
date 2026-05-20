import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let value = 0;
		let queued = [];

		function delayed(v) {
			if (!v) return v;

			return new Promise((resolve) => {
				queued.push(() => resolve(v));
			});
		}

		$$renderer.push(`<button>increment</button> <button>shift</button> ${$.escape(value)} `);

		if (1) {
			$$renderer.push('<!--[0-->');

			let tmp;
			var promises = $$renderer.run([async () => tmp = (await $.save(delayed(value)))()]);

			$$renderer.push(`<p>pending: ${$.escape(0)}</p> `);

			if (0 > 0) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<p>loading...</p>`);
			} else {
				$$renderer.push('<!--[-1-->');
				$$renderer.push(`<p>`);
				$$renderer.async([promises[0]], ($$renderer) => $$renderer.push(() => $.escape(tmp)));
				$$renderer.push(`</p>`);
			}

			$$renderer.push(`<!--]-->`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}