import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let foo = $$props['foo'];

	$$renderer.push(`<p>${$.escape(foo)}</p>`);
	$.bind_props($$props, { foo });
}