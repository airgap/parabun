import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let logs = $.fallback($$props['logs'], () => [], true);

	Widget($$renderer, { logs });
	$.bind_props($$props, { logs });
}