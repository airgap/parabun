import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];

	$$renderer.push(`<svg><use${$.attr('xlink:href', `#${$.stringify(foo)}`)}></use></svg>`);
	$.bind_props($$props, { foo });
}