import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Widget($$renderer) {
	$$renderer.push(`<p>i am a widget</p>`);
}