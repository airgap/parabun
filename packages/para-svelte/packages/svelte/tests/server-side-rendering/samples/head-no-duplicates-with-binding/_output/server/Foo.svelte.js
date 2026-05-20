import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	let bar = $.fallback($$props['bar'], null);

	$.bind_props($$props, { bar });
}