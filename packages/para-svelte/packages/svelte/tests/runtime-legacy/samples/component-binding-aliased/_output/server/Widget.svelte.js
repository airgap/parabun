import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let foo = $.fallback($$props['bar'], 42);

	$.bind_props($$props, { bar: foo });
}