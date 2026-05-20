import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let cats = $$props['cats'];

	function someCheck() {}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(cats);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let cat = each_array[$$index];

		$$renderer.push(`<input type="checkbox"${$.attr('checked', cat.checked, true)}/>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { cats });
}