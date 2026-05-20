import * as $ from 'svelte/internal/server';

export default function Slider($$renderer, $$props) {
	let id = $$props['id'];

	$$renderer.push(`<div${$.attr('id', id)}><p class="svelte-1h2wt47">Slider</p> <span class="svelte-1h2wt47">Track</span></div>`);
	$.bind_props($$props, { id });
}