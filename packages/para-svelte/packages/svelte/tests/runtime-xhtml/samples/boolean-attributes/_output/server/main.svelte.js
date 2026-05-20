import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.push(`<input disabled="" hidden=""/>`);
}