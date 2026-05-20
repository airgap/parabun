import * as $ from 'svelte/internal/server';

export default function Slider($$renderer, $$props) {
	let id = $$props['id'];

	$$renderer.push(`<div${$.attr('id', id)}><p class="svelte-e420hn">Slider</p> <span class="svelte-e420hn">Track</span></div>`);
	$.bind_props($$props, { id });
}