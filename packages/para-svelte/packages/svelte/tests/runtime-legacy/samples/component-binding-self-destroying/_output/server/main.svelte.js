import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let show = $$props['show'];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		if (show) {
			$$renderer.push('<!--[0-->');

			Nested($$renderer, {
				get show() {
					return show;
				},

				set show($$value) {
					show = $$value;
					$$settled = false;
				}
			});
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`<button>Show</button>`);
		}

		$$renderer.push(`<!--]-->`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { show });
}