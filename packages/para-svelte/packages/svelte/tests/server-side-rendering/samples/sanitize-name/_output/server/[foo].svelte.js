import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function _foo_($$renderer) {
	$$renderer.push(`<p>foo!</p>`);
}