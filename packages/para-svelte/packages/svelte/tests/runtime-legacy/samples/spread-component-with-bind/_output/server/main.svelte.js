import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let props = $.fallback($$props['props'], () => ({}), true);
	let x = $.fallback($$props['x'], 'foo');
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		if (Widget) {
			$$renderer.push('<!--[-->');

			Widget($$renderer, $.spread_props([
				props,
				{
					get value() {
						return x;
					},

					set value($$value) {
						x = $$value;
						$$settled = false;
					}
				}
			]));

			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { props, x });
}