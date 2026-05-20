import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let color = $.fallback($$props['color'], "red");

	$$renderer.push(`<p${$.attr_style('', { color })}></p> <!--[-->`);

	const each_array = $.ensure_array_like([1]);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let _ = each_array[$$index];

		$$renderer.push(`<p${$.attr_style('', { color })}></p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { color });
}