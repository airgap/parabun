import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './child.svelte';

var root_2 = $.from_html(`<p>bar</p>`);

export default function Main($$anchor) {
	Child($$anchor, {
		children: ($$anchor, $$slotProps) => {
			var p = root_2();

			$.append($$anchor, p);
		},
		$$slots: { default: true }
	});
}