import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let c;
	let a = $.fallback($$props['a'], 'a');
	let b;

	function foo() {
		b = c === 'a' ? 'b' : 'c';
	}

	foo();

	$: c = a;

	$$renderer.push(`<p>${$.escape(a)}${$.escape(b)}${$.escape(c)}</p>`);
	$.bind_props($$props, { a });
}