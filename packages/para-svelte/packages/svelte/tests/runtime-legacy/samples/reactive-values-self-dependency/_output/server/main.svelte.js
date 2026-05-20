import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let a = $.fallback($$props['a'], 1);
	let b = $.fallback($$props['b'], 2);
	let c;
	let count = 0;

	$: {
		c = a + b;
		count = count + 1;
	}

	$$renderer.push(`<p>${$.escape(a)} + ${$.escape(b)} = ${$.escape(c)}</p> <p>Times calculated: ${$.escape(count)}</p>`);
	$.bind_props($$props, { a, b });
}