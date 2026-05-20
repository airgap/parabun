import * as $ from 'svelte/internal/server';

export default function Counter($$renderer, $$props) {
	let count = $.fallback($$props['count'], 0);

	$$renderer.push(`<button>+1</button>`);
	$.bind_props($$props, { count });
}