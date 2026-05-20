import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let things = $$props['things'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(things);

	for (let i = 0, $$length = each_array.length; i < $$length; i++) {
		let _ = each_array[i];

		$$renderer.push(`<p>${$.escape(i)}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { things });
}