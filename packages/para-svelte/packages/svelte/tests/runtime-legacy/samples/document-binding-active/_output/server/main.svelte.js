import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let active;

	$: console.log(active?.id || active?.nodeName || '...');

	$$renderer.push(`<button id="one">one</button> <button id="two">two</button>`);
}