import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let // Could be a let or simplified, but this tests that it still works like this
	indirect_double;

	let count = 1;

	$: indirect_double = 2;

	$: if (count > 0) {
		indirect_double = count * 2;
	}

	$$renderer.push(`<h1>${$.escape(indirect_double)}</h1> <button>Increment</button>`);
}