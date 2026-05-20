import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { create_derived } from './state.svelte.js';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { promise, num } = $$props;
		var derived;

		var $$promises = $$renderer.run([
			async () => derived = await create_derived(() => promise, () => num),
			() => {
				void void 0;
				void void 0;
			}
		]);

		$$renderer.push(`<p>`);
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(derived.value)));
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(console.log(`template ${derived.value} ${num}`))));
		$$renderer.push(`</p>`);
	});
}