import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let visible = 0;

	function customTransition() {
		console.log(false);
	}

	$$renderer.push(`<button>Toggle</button> `);

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div>clicks</div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
}