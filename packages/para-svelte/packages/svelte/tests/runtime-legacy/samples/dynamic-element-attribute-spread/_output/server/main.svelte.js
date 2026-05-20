import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let props = $.fallback($$props['props'], () => ({ disabled: false, type: 'button', 'data-named': 'foo' }), true);

	$.element(
		$$renderer,
		"button",
		() => {
			$$renderer.push(`${$.attributes({ ...props })}`);
		},
		() => {
			$$renderer.push(`Click me`);
		}
	);

	$.bind_props($$props, { props });
}