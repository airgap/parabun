import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let disabled = $.fallback($$props['disabled'], false);

	$.element(
		$$renderer,
		"button",
		() => {
			$$renderer.push(`${$.attr('disabled', disabled, true)}`);
		},
		() => {
			$$renderer.push(`Click me`);
		}
	);

	$.bind_props($$props, { disabled });
}