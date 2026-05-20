import * as $ from 'svelte/internal/server';

export default function Component($$renderer, $$props) {
	let count = $$props['count'];
	let value = $$props['value'];

	$$renderer.push(`<div>count: ${$.escape(count)}</div> <div>value: ${$.escape(value)}</div>`);
	$.bind_props($$props, { count, value });
}