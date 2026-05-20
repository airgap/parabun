import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let x = 1;
	let y = 1;
	let z = $.derived(() => x * y);

	$$renderer.push(`<button>${$.escape(z())}</button>`);
}