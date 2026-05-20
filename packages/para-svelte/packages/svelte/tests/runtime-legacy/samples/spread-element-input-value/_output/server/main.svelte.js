import * as $ from 'svelte/internal/server';
import InputOne from './InputOne.svelte';
import InputTwo from './InputTwo.svelte';

export default function Main($$renderer, $$props) {
	let val1 = $.fallback($$props['val1'], '');
	let val2 = $.fallback($$props['val2'], '');
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		InputOne($$renderer, {
			required: true,
			minlength: '10',
			get value() {
				return val1;
			},

			set value($$value) {
				val1 = $$value;
				$$settled = false;
			}
		});

		$$renderer.push(`<!----> `);

		InputTwo($$renderer, {
			required: true,
			minlength: '10',
			get value() {
				return val2;
			},

			set value($$value) {
				val2 = $$value;
				$$settled = false;
			}
		});

		$$renderer.push(`<!---->`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { val1, val2 });
}