import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Sub($$renderer) {
	$$renderer.push(`<button>sub</button>`);
}