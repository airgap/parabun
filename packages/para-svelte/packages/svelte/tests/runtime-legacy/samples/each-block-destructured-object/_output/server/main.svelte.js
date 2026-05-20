import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let animalPawsEntries = $$props['animalPawsEntries'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(animalPawsEntries);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let { animal, pawType } = each_array[$$index];

		$$renderer.push(`<p>${$.escape(animal)}: ${$.escape(pawType)}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { animalPawsEntries });
}