import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Main($$renderer) {
	let count = 0;

	function failed($$renderer) {
		$$renderer.push(`<p>Error occurred</p>`);
	}

	$$renderer.push(`<button>change</button> `);

	$$renderer.boundary({ failed }, ($$renderer) => {
		$$renderer.push(`<!--[-->`);

		{
			Child($$renderer, { count });
		}

		$$renderer.push(`<!--]-->`);
	});
}