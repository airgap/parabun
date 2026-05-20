import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let animalEntries = $$props['animalEntries'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(animalEntries);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let { animal, ...props } = each_array[$$index];

		$$renderer.push(`<p${$.attributes({ ...props })}>${$.escape(animal)}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { animalEntries });
}