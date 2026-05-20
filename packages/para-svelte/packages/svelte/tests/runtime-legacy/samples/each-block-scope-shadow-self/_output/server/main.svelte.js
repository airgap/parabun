import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let x = $.fallback($$props['x'], () => ['a', 'b', 'c'], true);
		let data = $.fallback($$props['data'], () => ({ 'a': 'A', 'b': 'B', 'c': 'C' }), true);

		function getData() {
			return data;
		}

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(x);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let x = each_array[$$index];

			$$renderer.push(`<input type="text"${$.attr('value', data[x])}/>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { x, data, getData });
	});
}