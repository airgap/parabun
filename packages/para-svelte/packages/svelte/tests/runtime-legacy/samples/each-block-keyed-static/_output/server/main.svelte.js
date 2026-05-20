import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(x);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let y = each_array[$$index];

		$$renderer.push(`<p>does not change</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { x });
}