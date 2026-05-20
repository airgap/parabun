import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let count = $.fallback($$props['count'], 0);

	$: if (count >= 10) {
		count = 9;
	}

	$$renderer.push(`<p>count: ${$.escape(count)}</p>`);
	$.bind_props($$props, { count });
}