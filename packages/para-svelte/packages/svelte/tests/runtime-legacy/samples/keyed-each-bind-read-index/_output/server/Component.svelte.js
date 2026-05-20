import * as $ from 'svelte/internal/server';

export default function Component($$renderer, $$props) {
	let item = $$props['item'];

	console.log(item);
	item = 1;
	$.bind_props($$props, { item });
}