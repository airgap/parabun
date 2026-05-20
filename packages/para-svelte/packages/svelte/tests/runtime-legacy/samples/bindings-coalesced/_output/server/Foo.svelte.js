import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	let bar = $.fallback($$props['bar'], 1);
	let baz = $.fallback($$props['baz'], 2);

	function double() {
		bar = bar * 2;
		baz = baz * 2;
	}

	$$renderer.push(`<p>bar in Foo: ${$.escape(bar)}</p> <p>baz in Foo: ${$.escape(baz)}</p>`);
	$.bind_props($$props, { bar, baz, double });
}