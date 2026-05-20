import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let squared;
	const num = 2;

	$: squared = num * num;

	$$renderer.push(`<p>${$.escape(squared)}</p>`);
}