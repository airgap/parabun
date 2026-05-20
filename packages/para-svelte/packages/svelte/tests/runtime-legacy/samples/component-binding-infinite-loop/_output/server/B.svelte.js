import * as $ from 'svelte/internal/server';
import C from './C.svelte';

export default function B($$renderer, $$props) {
	let list = $.fallback($$props['list'], () => [1, 2, 3, 2, 1], true);
	let currentIdentifier = $$props['currentIdentifier'];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(list);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			$$renderer.push(`<p>`);

			C($$renderer, {
				identifier: item,
				get currentIdentifier() {
					return currentIdentifier;
				},

				set currentIdentifier($$value) {
					currentIdentifier = $$value;
					$$settled = false;
				},

				children: ($$renderer) => {
					$$renderer.push(`<!---->${$.escape(item)}`);
				},
				$$slots: { default: true }
			});

			$$renderer.push(`<!----></p>`);
		}

		$$renderer.push(`<!--]-->`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { list, currentIdentifier });
}