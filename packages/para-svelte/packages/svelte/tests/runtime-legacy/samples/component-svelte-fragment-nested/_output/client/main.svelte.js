import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_4 = $.from_html(`<p>B slot</p>`);

export default function Main($$anchor) {
	Child($$anchor, {
		children: ($$anchor, $$slotProps) => {
			var text = $.text('Default');

			$.append($$anchor, text);
		},

		$$slots: {
			default: true,
			b: ($$anchor, $$slotProps) => {
				var p = root_4();

				$.append($$anchor, p);
			}
		}
	});
}