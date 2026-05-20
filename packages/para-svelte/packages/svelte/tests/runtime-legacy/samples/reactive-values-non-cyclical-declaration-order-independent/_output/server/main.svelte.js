import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let a, b, c;

	$: a = 2;
	$: b = a;
	$: c = a + b;

	$$renderer.push(`<p>${$.escape(a)}+${$.escape(b)}=${$.escape(c)}</p>`);
}