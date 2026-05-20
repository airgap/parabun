import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function A($$renderer) {
	let open = false;
	let menuOptionsEl = null;

	$$renderer.push(`<button>toggle `);

	if (open) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<span>A</span>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--></button>`);
}