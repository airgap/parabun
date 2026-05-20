import * as $ from 'svelte/internal/server';
import Rect from './Rect.svelte';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];
	let y = $$props['y'];
	let width = $$props['width'];
	let height = $$props['height'];

	$$renderer.push(`<svg>`);
	Rect($$renderer, { x, y, width, height });
	$$renderer.push(`<!----></svg>`);
	$.bind_props($$props, { x, y, width, height });
}