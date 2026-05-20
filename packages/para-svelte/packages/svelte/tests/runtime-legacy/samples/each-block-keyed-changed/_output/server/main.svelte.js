import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let titles = $$props['titles'];

	$$renderer.push(`<div class="container"><!--[-->`);

	const each_array = $.ensure_array_like(titles);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let title = each_array[$$index];

		$$renderer.push(`<p>${$.escape(title.name)}</p>`);
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { titles });
}