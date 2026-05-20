import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let a = $$props['a'];
	let b = $$props['b'];

	Nested($$renderer, { a, b });
	$.bind_props($$props, { a, b });
}