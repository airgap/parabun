import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let characters = $$props['characters'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(characters);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let char = each_array[$$index];

		$$renderer.push(`<span>${$.escape(char)}</span>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { characters });
}