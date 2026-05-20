import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], '');

	$$renderer.push(`<input${$.attr('value', foo)}/>`);
	$.bind_props($$props, { foo });
}