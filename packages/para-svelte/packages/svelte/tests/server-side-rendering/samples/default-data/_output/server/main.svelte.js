import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], 1);

	$$renderer.push(`<p>${$.escape(foo)}</p>`);
	$.bind_props($$props, { foo });
}