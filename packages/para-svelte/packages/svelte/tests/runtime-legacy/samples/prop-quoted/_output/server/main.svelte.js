import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];

	Nested($$renderer, { 'x-y-z': foo });
	$.bind_props($$props, { foo });
}