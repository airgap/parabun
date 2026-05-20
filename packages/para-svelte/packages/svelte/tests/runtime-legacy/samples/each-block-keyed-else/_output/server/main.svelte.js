import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let animals = $$props['animals'];
	let foo = $$props['foo'];

	$$renderer.push(`<!---->before `);

	const each_array = $.ensure_array_like(animals);

	if (each_array.length !== 0) {
		$$renderer.push('<!--[-->');

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let animal = each_array[$$index];

			$$renderer.push(`<p>${$.escape(animal)}</p>`);
		}
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push(`<p>no animals, but rather ${$.escape(foo)}</p>`);
	}

	$$renderer.push(`<!--]--> after`);
	$.bind_props($$props, { animals, foo });
}