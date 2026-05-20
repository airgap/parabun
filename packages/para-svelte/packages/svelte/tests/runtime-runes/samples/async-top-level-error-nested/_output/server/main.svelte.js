import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export let route = {};

export default function Main($$renderer) {
	function failed($$renderer) {
		$$renderer.push(`<p>failed</p>`);
	}

	$$renderer.push(`<button>reject</button> `);

	$$renderer.boundary({ failed }, ($$renderer) => {
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>pending</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}