import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	// ensure these are treated as dynamic, despite whatever
	// optimisations we might apply
	let svg = $.fallback($$props['svg'], 'svg');

	let path = $.fallback($$props['path'], 'path');

	$.element(
		$$renderer,
		svg,
		() => {
			$$renderer.push(` xmlns="http://www.w3.org/2000/svg"`);
		},
		() => {
			$.element($$renderer, path);
		}
	);

	$.bind_props($$props, { svg, path });
}