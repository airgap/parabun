import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let triple = $.fallback($$props['triple'], '<p>html</p>');

	$$renderer.push(`<div>${$.html(triple)}</div>`);
	$.bind_props($$props, { triple });
}