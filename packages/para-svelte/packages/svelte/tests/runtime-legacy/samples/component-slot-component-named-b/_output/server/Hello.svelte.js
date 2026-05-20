import * as $ from 'svelte/internal/server';

export default function Hello($$renderer, $$props) {
	let name = $$props['name'];

	$$renderer.push(`<span>Hello ${$.escape(name)}</span>`);
	$.bind_props($$props, { name });
}