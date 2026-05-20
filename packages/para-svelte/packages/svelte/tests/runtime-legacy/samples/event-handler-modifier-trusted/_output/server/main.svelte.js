import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let trusted = $.fallback($$props['trusted'], true);

	$$renderer.push(`<button>Only trusted events: ${$.escape(trusted ? 'true' : 'false')}</button>`);
	$.bind_props($$props, { trusted });
}