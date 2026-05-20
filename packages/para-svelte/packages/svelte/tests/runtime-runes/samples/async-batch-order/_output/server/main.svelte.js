import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = 0;
		const deferred = [];

		function delay(value) {
			if (!value) return value;

			return new Promise((resolve) => deferred.push(() => resolve(value)));
		}

		$$renderer.push(`<div>${$.escape(a)} `);
		$$renderer.push(async () => $.escape((await $.save(delay(a)))()));
		$$renderer.push(` `);

		if (a < 2) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(async () => $.escape(await delay(a)));
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--></div> <button>a++</button> <button>shift</button> <button>middle</button>`);
	});
}