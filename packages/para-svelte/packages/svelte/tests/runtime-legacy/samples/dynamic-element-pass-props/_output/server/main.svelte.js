import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const tag = "div";
	let onClick = $$props['onClick'];

	$.element(
		$$renderer,
		tag,
		() => {
			$$renderer.push(` style="display: inline;"`);
		},
		() => {
			$$renderer.push(`Foo`);
		}
	);

	$.bind_props($$props, { onClick });
}