import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export const foo = 42;

export default function Foo($$anchor) {
	let foo = 100;

	console.log(foo);
}