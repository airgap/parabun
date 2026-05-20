import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let obj = $$props['obj'];
	let c = $$props['c'];
	let d = $$props['d'];

	$$renderer.push(`<!--[-->`);
	$.slot($$renderer, $$props, 'default', $.spread_props([{ c, d }, obj]), null);
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { obj, c, d });
}