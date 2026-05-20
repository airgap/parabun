import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let active = $$props['active'];

	$$renderer.push(`<div${$.attr_class(`thing ${$.stringify(active ? 'active' : '')}`, 'svelte-xyz')}>some stuff</div>`);
	$.bind_props($$props, { active });
}