import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], false);
	let bar = $.fallback($$props['bar'], false);

	$$renderer.push(`<div><button class="allow-propagation">click me</button></div> <div><button class="stop-propagation">click me</button></div>`);
	$.bind_props($$props, { foo, bar });
}