import * as $ from 'svelte/internal/server';

const foo = 42;

export default function Main($$renderer, $$props) {
	let bar = $.fallback($$props['bar'], 99);

	$$renderer.push(`<p>(42)(${$.escape(bar)})</p>`);
	$.bind_props($$props, { bar });
}