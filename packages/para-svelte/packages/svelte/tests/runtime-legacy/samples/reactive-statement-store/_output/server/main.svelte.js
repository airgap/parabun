import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let array, count, sum;
	let x = 1;
	let y = true;

	$: array = y ? [1, 2] : [1];
	$: count = array.length === 2 && x ? 1 : 0;
	$: sum = count + array.length;

	$$renderer.push(`<button>${$.escape(
		// order is important here: x must be updated before y
		// in order to test that $: still runs in the correct order
		sum
	)}</button>`);
}