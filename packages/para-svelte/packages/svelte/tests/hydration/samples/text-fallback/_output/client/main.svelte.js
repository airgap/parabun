import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_2 = $.from_html(`<div slot="foo">foo override</div>`);

export default function Main($$anchor) {
	Nested($$anchor, {
		children: ($$anchor, $$slotProps) => {
			$.next();

			var text = $.text('default');

			$.append($$anchor, text);
		},

		$$slots: {
			default: true,
			foo: ($$anchor, $$slotProps) => {
				var div = root_2();

				$.append($$anchor, div);
			}
		}
	});
}