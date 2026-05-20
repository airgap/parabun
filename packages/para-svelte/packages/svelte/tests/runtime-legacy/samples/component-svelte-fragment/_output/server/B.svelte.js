import * as $ from 'svelte/internal/server';

export default function B($$renderer, $$props) {
	let name = $$props['name'];

	$$renderer.push(`<div>Hello</div> <div>${$.escape(name)}</div>`);
	$.bind_props($$props, { name });
}