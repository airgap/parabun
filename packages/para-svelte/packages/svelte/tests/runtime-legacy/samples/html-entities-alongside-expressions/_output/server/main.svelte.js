import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let str = $.fallback($$props['str'], '>');

	$$renderer.push(`<div>&lt;p> &amp; ${$.escape(str)} &lt;/p></div>`);
	$.bind_props($$props, { str });
}