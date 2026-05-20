import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let node;
	let value = $.fallback($$props['value'], 'initial');

	$$renderer.push(`<input${$.attr('value', value)}/> <p>value: ${$.escape(value)}</p>`);
	$.bind_props($$props, { value });
}