import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let count = 0;

	$$renderer.push(`<p>${$.escape(count)}</p>`);
}