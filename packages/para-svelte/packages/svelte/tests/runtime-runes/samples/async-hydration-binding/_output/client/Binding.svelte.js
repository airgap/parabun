import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Bound from './Bound.svelte';

export default function Binding($$anchor) {
	let open;

	Bound($$anchor, {
		get open() {
			return open;
		},

		set open($$value) {
			open = $$value;
		}
	});
}