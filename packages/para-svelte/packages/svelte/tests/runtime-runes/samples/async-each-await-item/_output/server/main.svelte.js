import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let items = [
		Promise.withResolvers(),
		Promise.withResolvers(),
		Promise.withResolvers()
	];

	$$renderer.push(`<button>step 1</button> <button>step 2</button> <button>step 3</button> `);
	$$renderer.push(`<!--[!-->`);

	{
		$$renderer.push(`<p>pending</p>`);
	}

	$$renderer.push(`<!--]-->`);
}