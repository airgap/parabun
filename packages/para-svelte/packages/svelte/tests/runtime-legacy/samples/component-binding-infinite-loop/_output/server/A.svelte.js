import * as $ from 'svelte/internal/server';
import B from './B.svelte';

export default function A($$renderer, $$props) {
	let currentIdentifier = $$props['currentIdentifier'];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		B($$renderer, {
			get currentIdentifier() {
				return currentIdentifier;
			},

			set currentIdentifier($$value) {
				currentIdentifier = $$value;
				$$settled = false;
			}
		});

		$$renderer.push(`<!----> `);

		B($$renderer, {
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