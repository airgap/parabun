import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Sub($$renderer, $$props) {
	let { onClick } = $$props;

	$$renderer.push(`<button>Increment</button>`);
}