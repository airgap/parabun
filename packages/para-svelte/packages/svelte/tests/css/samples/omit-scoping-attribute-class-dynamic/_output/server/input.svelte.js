import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let unknown = $.fallback($$props['unknown'], 'whatever');

	$$renderer.push(`<p${$.attr_class(unknown, 'svelte-xyz')}>this is styled</p> <p class="bar">this is unstyled</p>`);
	$.bind_props($$props, { unknown });
}