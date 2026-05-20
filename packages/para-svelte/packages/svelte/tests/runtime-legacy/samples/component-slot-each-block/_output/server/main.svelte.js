import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let things = $$props['things'];

	Nested($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like(things);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let thing = each_array[$$index];

				$$renderer.push(`<span>${$.escape(thing)}</span>`);
			}

			$$renderer.push(`<!--]-->`);
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { things });
}