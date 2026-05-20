import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<input${$.attr('value', x)}/>`);
	$.bind_props($$props, { x });
}