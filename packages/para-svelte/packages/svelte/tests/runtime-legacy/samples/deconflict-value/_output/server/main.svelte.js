import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer) {
	let reactive;
	let value;

	$: reactive = value;

	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		Widget($$renderer, {
			get value() {
				return value;
			},

			set value($$value) {
				value = $$value;
				$$settled = false;
			}
		});

		$$renderer.push(`<!----> <p>Reactive: ${$.escape(reactive)}</p> <p>Value: ${$.escape(value)}</p>`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
}