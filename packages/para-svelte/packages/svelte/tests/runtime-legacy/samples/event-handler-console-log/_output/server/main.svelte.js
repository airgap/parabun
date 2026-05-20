import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];

	$$renderer.push(`<button>click me</button>`);
	$.bind_props($$props, { foo });
}