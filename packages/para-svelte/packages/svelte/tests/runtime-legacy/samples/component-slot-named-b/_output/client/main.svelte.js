import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<span slot="name"></span>`);

export default function Main($$anchor) {
	let name = 'world';

	Nested($$anchor, {
		$$slots: {
			name: ($$anchor, $$slotProps) => {
				var span = root_1();

				span.textContent = 'Hello world';
				$.append($$anchor, span);
			}
		}
	});
}