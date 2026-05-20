import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	const a = {};
	const b = {};

	$: b.foo = a.foo;

	$$renderer.push(`<button>Mutate a</button> <div>${$.escape(JSON.stringify(b))}</div>`);
}