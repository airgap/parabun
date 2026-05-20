import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function ComponentB($$renderer) {
	$$renderer.push(`<div>b</div>`);
}