import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let _ = "test";

	$$renderer.push(`<button></button>`);
}