import * as $ from 'svelte/internal/server';
import A from './A.svelte';

export default function Main($$renderer, $$props) {
	let currentIdentifier = $.fallback($$props['currentIdentifier'], 2);
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		A($$renderer, {
			get currentIdentifier() {
				return currentIdentifier;
			},

			set currentIdentifier($$value) {
				currentIdentifier = $$value;
				$$settled = false;
			}
		});

		$$renderer.push(`<!----> `);

		A($$renderer, {
			get currentIdentifier() {
				return currentIdentifier;
			},

			set currentIdentifier($$value) {
				currentIdentifier = $$value;
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
	$.bind_props($$props, { currentIdentifier });
}