import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let a = $$props['a'];
	let b = $$props['b'];

	$$renderer.push(`<input${$.attr('value', a)}/>`);
	$.bind_props($$props, { a, b });
}