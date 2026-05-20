import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let a = $$props['a'];
	let c = $$props['c'];
	let d = $$props['d'];

	$$renderer.push(`<div${$.attributes({ ...a, 'data-b': 'b', ...c, 'data-d': d })}>test</div>`);
	$.bind_props($$props, { a, c, d });
}