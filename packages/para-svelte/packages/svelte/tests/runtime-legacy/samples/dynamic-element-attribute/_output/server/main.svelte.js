import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let tag = $.fallback($$props['tag'], 'div');

	$.element(
		$$renderer,
		tag,
		() => {
			$$renderer.push(` style="color: red;"`);
		},
		() => {
			$$renderer.push(`Foo`);
		}
	);

	$.bind_props($$props, { tag });
}