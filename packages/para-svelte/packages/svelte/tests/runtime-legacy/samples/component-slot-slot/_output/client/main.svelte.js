import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Forward from './Forward.svelte';

var root_1 = $.from_html(`<span>lol</span>`);

export default function Main($$anchor) {
	Forward($$anchor, {
		children: ($$anchor, $$slotProps) => {
			var span = root_1();

			$.append($$anchor, span);
		},
		$$slots: { default: true }
	});
}