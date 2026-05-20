import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { promise } = $$props;
		var d;

		var $$promises = $$renderer.run([
			async () => d = await $.async_derived(async () => ({ value: await promise }))
		]);

		$$renderer.push(`<p>`);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(async () => $.escape((await $.save(d()))().value)));
		$$renderer.push(`</p>`);
	});
}