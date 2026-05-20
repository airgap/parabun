import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	let id = $$props['id'];

	$$renderer.push(`<!---->${$.escape(id)}`);
	$.bind_props($$props, { id });
}