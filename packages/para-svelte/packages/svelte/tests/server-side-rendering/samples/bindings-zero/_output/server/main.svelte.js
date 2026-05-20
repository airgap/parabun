import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], 0);

	$$renderer.push(`<input type="number"${$.attr('value', foo)}/> <input type="range"${$.attr('value', foo)}/>`);
	$.bind_props($$props, { foo });
}