import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let promise = $.fallback($$props['promise'], () => Promise.resolve(['a', 'b']), true);
	let value;
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		$.await(
			$$renderer,
			promise,
			() => {
				$$renderer.push(`Loading...`);
			},
			(options) => {
				Widget($$renderer, {
					options,
					get value() {
						return value;
					},

					set value($$value) {
						value = $$value;
						$$settled = false;
					}
				});

				$$renderer.push(`<!----> <span>${$.escape(value)}</span>`);
			}
		);

		$$renderer.push(`<!--]-->`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { promise });
}