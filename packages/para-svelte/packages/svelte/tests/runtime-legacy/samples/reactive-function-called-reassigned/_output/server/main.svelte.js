import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const refs = ['1', '2', '3'];
		let callback = $.fallback($$props['callback'], () => {});

		$: callback(refs);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(refs);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let ref = each_array[$$index];

			$$renderer.push(`<input${$.attr('value', ref)}/>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { callback });
	});
}