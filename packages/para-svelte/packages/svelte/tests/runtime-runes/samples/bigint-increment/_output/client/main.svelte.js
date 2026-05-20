import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor) {
	for (let i = 0n; i <= 5n; i++) {
		console.log(i);
	}
}