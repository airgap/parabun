import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let animalEntries = $$props['animalEntries'];
	const defaultHeight = 30;

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(animalEntries);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let {
			animal,
			species = 'unknown',
			kilogram: weight = 50,
			pound = (weight * 2.2).toFixed(0),
			height = defaultHeight,
			bmi = weight / (height * height),
			...props
		} = each_array[$$index];

		$$renderer.push(`<p${$.attributes({ ...props })}>${$.escape(animal)} - ${$.escape(species)} - ${$.escape(weight)}kg (${$.escape(pound)} lb) - ${$.escape(height)}cm - ${$.escape(bmi)}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { animalEntries, defaultHeight });
}