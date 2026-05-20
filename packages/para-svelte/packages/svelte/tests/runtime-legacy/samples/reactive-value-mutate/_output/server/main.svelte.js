import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let foo = {};
	let bar = 42;

	$: foo.bar = bar;

	$$renderer.push(`<!---->${$.escape(JSON.stringify(foo))}`);
}