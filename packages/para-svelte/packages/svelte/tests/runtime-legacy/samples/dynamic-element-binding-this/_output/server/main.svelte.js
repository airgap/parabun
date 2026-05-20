import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const tag = "div";
	let foo = $$props['foo'];

	$.element($$renderer, tag);
	$.bind_props($$props, { foo });
}