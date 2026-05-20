import * as $ from 'svelte/internal/server';

export default function Comp2($$renderer, $$props) {
	let value = $$props['value'];

	$$renderer.push(`<p>value(2) = ${$.escape(value)}</p>`);
	$.bind_props($$props, { value });
}