import * as $ from 'svelte/internal/server';
import Input from './TextInput.svelte';

export default function Main($$renderer, $$props) {
	let actualValue = $.fallback($$props['actualValue'], '');
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		Input($$renderer, {
			get actualValue() {
				return actualValue;
			},

			set actualValue($$value) {
				actualValue = $$value;
				$$settled = false;
			}
		});

		$$renderer.push(`<!----> <p>${$.escape(actualValue)}</p>`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { actualValue });
}