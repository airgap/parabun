import * as $ from 'svelte/internal/server';
import { Components } from './components.svelte';

export default function Main($$renderer, $$props) {
	let a = $$props['a'];

	Components.Foo($$renderer, { foo: a });
	$.bind_props($$props, { a });
}