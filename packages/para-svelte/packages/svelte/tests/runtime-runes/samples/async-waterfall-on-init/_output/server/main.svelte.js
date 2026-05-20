import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let d1 = Promise.withResolvers();
	let d2 = Promise.withResolvers();
	let count = 0;

	$$renderer.push(`<button>resolve 1</button> <button>resolve 2</button> <hr/> `);
	$$renderer.push(`<!--[!-->`);

	{
		$$renderer.push(`<p>pending</p>`);
	}

	$$renderer.push(`<!--]-->`);
}