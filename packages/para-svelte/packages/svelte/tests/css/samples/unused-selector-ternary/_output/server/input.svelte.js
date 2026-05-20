import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let active = $$props['active'];

	$$renderer.push(`<div${$.attr_class(active ? "active" : "inactive", 'svelte-xyz')}></div>`);
	$.bind_props($$props, { active });
}