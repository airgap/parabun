import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	$$renderer.push(`<div>`);
	Widget($$renderer, $.spread_props([$$sanitized_props, { qux: 'named' }]));
	$$renderer.push(`<!----></div>`);
}