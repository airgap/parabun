import * as $ from 'svelte/internal/server';
import Parent from './Parent.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let configs = $.fallback($$props['configs'], () => [], true);
		let parents = $.fallback($$props['parents'], () => ({}), true);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(configs);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let config = each_array[$$index];

			Parent($$renderer, { value: config.value, testcase: config.testcase });
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { configs, parents });
	});
}