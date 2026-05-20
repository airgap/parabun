import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let user;

	$: user = {};
	$: user.name = 'world';

	$$renderer.push(`<h1>Hello ${$.escape(user.name)}!</h1>`);
}