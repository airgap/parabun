import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	console.log("Injected first line");
	console.log('Target');
	$$renderer.push(`<h1>Hello</h1>`);
}