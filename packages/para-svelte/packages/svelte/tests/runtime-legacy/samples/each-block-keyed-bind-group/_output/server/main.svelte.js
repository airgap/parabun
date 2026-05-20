import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let flavours = ['Vanilla', 'Strawberry', 'Chocolate', 'Lemon', 'Coconut'];
	let choices = [];

	$: // Put choices first by sorting
	flavours = flavours.sort((a, b) => choices.includes(b) - choices.includes(a));

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(flavours);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let flavour = each_array[$$index];

		$$renderer.push(`<label><input type="checkbox"${$.attr('checked', choices.includes(flavour), true)}${$.attr('value', flavour)}/> ${$.escape(flavour)}</label>`);
	}

	$$renderer.push(`<!--]-->`);
}