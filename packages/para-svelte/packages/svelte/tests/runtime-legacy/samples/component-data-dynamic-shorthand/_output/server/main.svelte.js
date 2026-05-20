import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];

	$$renderer.push(`<div>`);
	Widget($$renderer, { foo });
	$$renderer.push(`<!----></div>`);
	$.bind_props($$props, { foo });
}