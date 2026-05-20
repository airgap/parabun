import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let a = $$props['a'];
	let b = $$props['b'];
	let c = $$props['c'];
	let d = $$props['d'];

	Nested($$renderer, { foo: a, bar: b, baz: c, qux: d });
	$.bind_props($$props, { a, b, c, d });
}