import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let count = $.fallback($$props['count'], 0);

	$.bind_props($$props, { count });
}