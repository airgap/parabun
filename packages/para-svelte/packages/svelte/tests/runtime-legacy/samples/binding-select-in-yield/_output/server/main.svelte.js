import * as $ from 'svelte/internal/server';
import Modal from './Modal.svelte';

export default function Main($$renderer, $$props) {
	let modal = $$props['modal'];
	let letter = $$props['letter'];
	let letters = $.fallback($$props['letters'], () => ['a', 'b', 'c'], true);

	Modal($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<span>${$.escape(letter)}</span> `);

			$$renderer.select({ value: letter }, ($$renderer) => {
				$$renderer.push(`<!--[-->`);

				const each_array = $.ensure_array_like(letters);

				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let letter = each_array[$$index];

					$$renderer.option({ value: letter }, ($$renderer) => {
						$$renderer.push(`${$.escape(letter)}`);
					});
				}

				$$renderer.push(`<!--]-->`);
			});
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { modal, letter, letters });
}