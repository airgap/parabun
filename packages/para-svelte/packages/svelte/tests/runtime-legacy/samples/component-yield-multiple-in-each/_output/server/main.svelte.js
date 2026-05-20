import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let people = $.fallback($$props['people'], () => ['Alice', 'Bob', 'Charles'], true);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(people);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let person = each_array[$$index];

		Widget($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<!---->Hello ${$.escape(person)}`);
			},
			$$slots: { default: true }
		});
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { people });
}