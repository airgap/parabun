import * as $ from 'svelte/internal/server';

export default function Nested2($$renderer, $$props) {
	let text = $$props['text'];

	$$renderer.push(`<div>${$.escape(text)} <hr/> <!--[-->`);
	$.slot($$renderer, $$props, 'footer', {}, null);
	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { text });
}