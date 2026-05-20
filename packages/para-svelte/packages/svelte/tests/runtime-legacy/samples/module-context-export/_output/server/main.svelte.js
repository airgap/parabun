import * as $ from 'svelte/internal/server';
import { foo } from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let bar = $.fallback($$props['bar'], 99);

	$$renderer.push(`<p>(${$.escape(foo)})(${$.escape(bar)})</p>`);
	$.bind_props($$props, { bar });
}