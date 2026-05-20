import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let id = $.fallback($$props['id'], 0);
		let value = $$props['value'];

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(['foo', 'bar']);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let key = each_array[$$index];

			$$renderer.push(`<div>${$.escape(value())}</div>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { id, value });
	});
}