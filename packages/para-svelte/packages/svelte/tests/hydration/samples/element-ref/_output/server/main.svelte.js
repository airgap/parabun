import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let h1 = $$props['h1'];

	$$renderer.push(`<h1>Hello world!</h1>`);
	$.bind_props($$props, { h1 });
}