import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];
	let bar = $$props['bar'];

	$$renderer.push(`<button>click me</button> <p>foo: ${$.escape(foo)}</p> <p>bar: ${$.escape(bar)}</p>`);
	$.bind_props($$props, { foo, bar });
}