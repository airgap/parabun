import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { hydratable } from "svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { key } = $$props;
		var value;

		var $$promises = $$renderer.run([
			async () => value = await hydratable(key, () => Promise.resolve('safe'))
		]);

		$$renderer.push(`<p>`);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(value)));
		$$renderer.push(`</p>`);
	});
}