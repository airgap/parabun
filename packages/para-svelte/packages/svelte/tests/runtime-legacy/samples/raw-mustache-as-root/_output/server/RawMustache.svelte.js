import * as $ from 'svelte/internal/server';

export default function RawMustache($$renderer, $$props) {
	let content = $$props['content'];

	$$renderer.push(`${$.html(content)}`);
	$.bind_props($$props, { content });
}