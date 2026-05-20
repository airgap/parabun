import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let name = $$props['name'];

	$$renderer.push(`<h1>Hello <strong>${$.escape(name)}!</strong> <span>How are you?</span></h1>`);
	$.bind_props($$props, { name });
}