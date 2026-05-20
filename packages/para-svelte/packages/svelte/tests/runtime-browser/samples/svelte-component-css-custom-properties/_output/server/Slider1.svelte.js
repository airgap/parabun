import * as $ from 'svelte/internal/server';

export default function Slider1($$renderer, $$props) {
	let id = $$props['id'];

	$$renderer.push(`<div${$.attr('id', id)}><p class="svelte-lr0dmg">Slider1</p> <span class="svelte-lr0dmg">Track</span></div>`);
	$.bind_props($$props, { id });
}