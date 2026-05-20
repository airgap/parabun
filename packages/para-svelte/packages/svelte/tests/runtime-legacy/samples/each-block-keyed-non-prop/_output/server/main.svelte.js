import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let words = $$props['words'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(words);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let word = each_array[$$index];

		$$renderer.push(`<p>${$.escape(word)}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { words });
}