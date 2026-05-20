import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<p slot="foo-bar">Hello</p>`);

export default function Main($$anchor) {
	Nested($$anchor, {
		$$slots: {
			'foo-bar': ($$anchor, $$slotProps) => {
				var p = root_1();

				$.append($$anchor, p);
			}
		}
	});
}