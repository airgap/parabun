import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let a = 1;
	let b = 2;

	$$renderer.push(`<button>both</button> <button>a</button> <button>b</button> `);
	$$renderer.push(`<!--[!-->`);

	{
		$$renderer.push(`<p>loading...</p>`);
	}

	$$renderer.push(`<!--]-->`);
}