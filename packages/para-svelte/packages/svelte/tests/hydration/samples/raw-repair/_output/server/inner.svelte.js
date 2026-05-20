import * as $ from 'svelte/internal/server';

export default function Inner($$renderer, $$props) {
	let content = $$props['content'];

	$$renderer.push(`<p>${$.html(content)}</p>`);
	$.bind_props($$props, { content });
}