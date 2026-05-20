import * as $ from 'svelte/internal/server';

export default function Slider2($$renderer, $$props) {
	let id = $$props['id'];

	$$renderer.push(`<div${$.attr('id', id)}><p class="svelte-1q83jh7">Slider2</p> <span class="svelte-1q83jh7">Track</span></div>`);
	$.bind_props($$props, { id });
}