import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	let x = $.fallback($$props['x'], 1);

	$$renderer.push(`<!---->:foo:`);
	$.bind_props($$props, { x });
}