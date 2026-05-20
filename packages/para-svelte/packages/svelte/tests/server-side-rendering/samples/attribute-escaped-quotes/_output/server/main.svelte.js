import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], '"></div>\\<script>alert(42)</' + 'script>');
	let bar = $.fallback($$props['bar'], () => ({ toString: () => '"></div>\\<script>alert(42)<\/script>' }), true);

	$$renderer.push(`<div${$.attr('foo', foo)}${$.attr('bar', bar)}></div>`);
	$.bind_props($$props, { foo, bar });
}