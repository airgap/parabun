import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let widget = $$props['widget'];
	let foo = $.fallback($$props['foo'], 42);

	$$renderer.push(`<div>`);
	Widget($$renderer, { foo });
	$$renderer.push(`<!----></div>`);
	$.bind_props($$props, { widget, foo });
}