import * as $ from 'svelte/internal/server';

export default function Two($$renderer, $$props) {
	let bar = $.fallback($$props['bar'], 1);

	function foo() {
		return bar * 2;
	}

	$.bind_props($$props, { bar, foo });
}