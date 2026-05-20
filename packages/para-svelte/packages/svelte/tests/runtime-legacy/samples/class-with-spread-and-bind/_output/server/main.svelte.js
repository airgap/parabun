import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let primary = $.fallback($$props['primary'], true);
	let elem;

	$$renderer.push(`<div${$.attributes({ class: 'test-class', ...{ role: 'button' } }, void 0, { primary })}></div>`);
	$.bind_props($$props, { primary });
}