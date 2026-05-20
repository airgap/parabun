import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let widget = $$props['widget'];

	$$renderer.push(`<div>`);
	Widget($$renderer, {});
	$$renderer.push(`<!----></div>`);
	$.bind_props($$props, { widget });
}