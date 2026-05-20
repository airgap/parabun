import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], 1);
	let bar = $$props['bar'];
	let baz = $$props['baz'];
	let qux = $$props['qux'];

	$: {
		bar = foo;
		baz = foo;
	}

	$: {
		qux = bar + baz;
	}

	$.bind_props($$props, { foo, bar, baz, qux });
}