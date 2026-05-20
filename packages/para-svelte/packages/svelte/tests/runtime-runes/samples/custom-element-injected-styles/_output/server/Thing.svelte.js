import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Thing($$renderer) {
	$$renderer.push(`<h1 class="svelte-4oxdbo">hello</h1>`);
}