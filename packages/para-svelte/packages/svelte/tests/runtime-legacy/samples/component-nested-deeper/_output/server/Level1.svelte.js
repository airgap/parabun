import * as $ from 'svelte/internal/server';
import Level2 from './Level2.svelte';
import Level3 from './Level3.svelte';

export default function Level1($$renderer, $$props) {
	let values = $$props['values'];

	$$renderer.push(`<div class="level1"><!--[-->`);

	const each_array = $.ensure_array_like(values);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let value = each_array[$$index];

		$$renderer.push(`<h4>level 1 #${$.escape(value)}</h4> `);

		Level2($$renderer, {
			condition: value % 2,
			children: ($$renderer) => {
				Level3($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<span>And more stuff goes in here</span>`);
					},
					$$slots: { default: true }
				});
			},
			$$slots: { default: true }
		});

		$$renderer.push(`<!---->`);
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { values });
}