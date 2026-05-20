import * as $ from 'svelte/internal/server';

export default function Component($$renderer, $$props) {
	let count = $$props['count'];

	$$renderer.push(`<div>count: ${$.escape(count)}</div>`);
	$.bind_props($$props, { count });
}