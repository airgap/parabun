import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let title = $$props['title'];

	$$renderer.push(`<p>${$.escape(title)}</p>`);
	$.bind_props($$props, { title });
}