import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let a = $$props['a'];
	let b = $$props['b'];
	let c = $$props['c'];

	$$renderer.push(`<div${$.attr_class(`foo${$.stringify(a ? ' aa' : b ? ' bb ' : c ? 'cc ' : 'dd')}bar baz ${$.stringify(a ? ' aa' : b ? ' bb ' : c ? 'cc ' : 'dd')}`, 'svelte-xyz')}>some stuff</div>`);
	$.bind_props($$props, { a, b, c });
}