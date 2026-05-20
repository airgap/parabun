import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { promise, num } = $$props;
		var value;

		var $$promises = $$renderer.run([
			async () => value = await $.async_derived(async () => num + await promise),
			() => {
				void void 0;
				void void 0;
			}
		]);

		$$renderer.push(`<p>`);
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(value())));
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(console.log(`template ${value()} ${num}`))));
		$$renderer.push(`</p>`);
	});
}