import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

function hello($$renderer, message) {
	$$renderer.push(`<h1>${$.escape(message)}</h1>`);
}

export default function Main($$renderer) {
	let deferred = Promise.withResolvers();

	$$renderer.push(`<button>reset</button> <button>hello</button> <button>wheee</button> `);
	$$renderer.push(`<!--[!-->`);

	{
		$$renderer.push(`<p>pending</p>`);
	}

	$$renderer.push(`<!--]-->`);
}