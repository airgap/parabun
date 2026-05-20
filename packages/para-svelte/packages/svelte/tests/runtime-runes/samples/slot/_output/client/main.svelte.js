import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Slot from './slot.svelte';

var root_1 = $.from_html(`<p>bar</p>`);

export default function Main($$anchor) {
	Slot($$anchor, {
		children: ($$anchor, $$slotProps) => {
			var p = root_1();

			$.append($$anchor, p);
		},
		$$slots: { default: true }
	});
}