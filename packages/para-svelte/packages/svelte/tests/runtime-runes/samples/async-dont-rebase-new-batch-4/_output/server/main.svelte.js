import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { untrack } from "svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		let double = $.derived(() => count * 2);
		let count_mirror = 0;
		let unrelated = 0;
		let count_mirror_d = $.derived(() => count_mirror * 2);
		const queued = [];

		function delay(v) {
			if (!v) return v;

			return new Promise((resolve) => {
				queued.push(() => resolve(v));
			});
		}

		$$renderer.push(`<button>count `);
		$$renderer.push(async () => $.escape((await $.save(delay(count)))()));
		$$renderer.push(` | count_mirror `);
		$$renderer.push(async () => $.escape((await $.save(delay(count_mirror)))()));
		$$renderer.push(` | count_mirror_d ${$.escape(count_mirror_d())} | unrelated ${$.escape(unrelated)}</button> <button>unrelated++</button> <button>resolve</button> `);

		if (count) {
			$$renderer.push('<!--[0-->');

			$$renderer.push(`${$.escape((() => {
				// execute derived; should associate value with the right batch
			})())} ${$.escape((() => {})())}`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}