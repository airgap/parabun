import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let clientHeight = $$props['clientHeight'];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		Nested($$renderer, {
			get clientHeight() {
				return clientHeight;
			},

			set clientHeight($$value) {
				clientHeight = $$value;
				$$settled = false;
			},

			children: ($$renderer) => {
				$$renderer.push(`<!---->Hello`);
			},
			$$slots: { default: true }
		});
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { clientHeight });
}