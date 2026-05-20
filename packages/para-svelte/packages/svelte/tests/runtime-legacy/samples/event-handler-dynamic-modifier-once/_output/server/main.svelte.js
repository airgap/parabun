import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let f;
	let count = $.fallback($$props['count'], 0);

	f = () => count += 1;
	$$renderer.push(`<button>${$.escape(count)}</button>`);
	$.bind_props($$props, { count });
}