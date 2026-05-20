import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let animals = $$props['animals'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(animals);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let animal = each_array[$$index];

		$$renderer.push(`<!---->(${$.escape(animal)})`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { animals });
}