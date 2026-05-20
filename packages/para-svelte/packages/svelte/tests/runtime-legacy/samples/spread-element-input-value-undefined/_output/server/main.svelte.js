import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], '');

	$$renderer.push(`<input${$.attributes({ value, ...{} }, void 0, void 0, void 0, 4)}/>`);
	$.bind_props($$props, { value });
}