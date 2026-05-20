import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	function fade(_) {
		return { delay: 100, duration: 100, css: (t) => `opacity: ${t}` };
	}

	let visible = false;

	$$renderer.push(`<button>toggle</button> `);

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>delayed fade</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
}