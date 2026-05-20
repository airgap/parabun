import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];
	let bar = $$props['bar'];

	function click() {
		foo = 4;
		bar = 2;
	}

	$$renderer.push(`<button>click me</button> <p>foo: ${$.escape(foo)}</p> <p>bar: ${$.escape(bar)}</p>`);
	$.bind_props($$props, { foo, bar });
}