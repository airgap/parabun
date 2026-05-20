import * as $ from 'svelte/internal/server';

export default function Slider1($$renderer, $$props) {
	let id = $$props['id'];

	$$renderer.push(`<div${$.attr('id', id)}><p class="svelte-1f3l2oc">Slider1</p> <span class="svelte-1f3l2oc">Track</span></div>`);
	$.bind_props($$props, { id });
}