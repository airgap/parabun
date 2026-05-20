import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Icon($$renderer) {
	$$renderer.push(`<span>x</span>`);
}