import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor) {
	let value = $.state(42);

	function shadow(output = $.get(value)) {
		const value = 1337;

		return output;
	}

	console.log(shadow());
	$.set(value, $.get(value) + 1);
	console.log(shadow());
}