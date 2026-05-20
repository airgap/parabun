import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Main($$renderer) {
	let numbers = [1, 2, 3];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		$$renderer.push(`<p>${$.escape(numbers.join(', '))}</p> <!--[-->`);

		const each_array = $.ensure_array_like(numbers);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let n = each_array[$$index];

			Child($$renderer, {
				get value() {
					return n;
				},

				set value($$value) {
					n = $$value;
					$$settled = false;
				}
			});
		}

		$$renderer.push(`<!--]--> <p>${$.escape(numbers.join(', '))}</p>`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
}