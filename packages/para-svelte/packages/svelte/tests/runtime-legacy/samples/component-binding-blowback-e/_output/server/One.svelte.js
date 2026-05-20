import * as $ from 'svelte/internal/server';
import Two from './Two.svelte';

export default function One($$renderer, $$props) {
	let list = $$props['list'];
	let i = $$props['i'];

	function handle_click() {
		list = [...list, {}];
	}

	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(list);

		for (let j = 0, $$length = each_array.length; j < $$length; j++) {
			let item = each_array[j];

			Two($$renderer, {
				i,
				j,
				get value() {
					return item.value;
				},

				set value($$value) {
					item.value = $$value;
					$$settled = false;
				}
			});
		}

		$$renderer.push(`<!--]--> <button>click me</button>`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { list, i });
}