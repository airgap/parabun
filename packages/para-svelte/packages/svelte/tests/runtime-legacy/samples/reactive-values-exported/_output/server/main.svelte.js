import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];
	let y = $$props['y'];
	let z = $$props['z'];

	$: y = x;
	$: z = x;

	$$renderer.push(`<p>${$.escape(x)} ${$.escape(y)} ${$.escape(z)}</p>`);
	$.bind_props($$props, { x, y, z });
}