import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let a = $.fallback($$props['a'], 1);
	let b = $.fallback($$props['b'], 2);
	let c = $$props['c'];
	let cSquared = $$props['cSquared'];

	$: c = a + b;
	$: cSquared = c * c;

	$$renderer.push(`<p>${$.escape(a)} + ${$.escape(b)} = ${$.escape(c)}</p> <p>${$.escape(c)} * ${$.escape(c)} = ${$.escape(cSquared)}</p>`);
	$.bind_props($$props, { a, b, c, cSquared });
}