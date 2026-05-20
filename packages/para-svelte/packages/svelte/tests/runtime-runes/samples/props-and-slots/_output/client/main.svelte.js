import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(`<div slot="foo">foo</div>`);

export default function Main($$anchor) {
	Child($$anchor, {
		a: 'b',
		$$slots: {
			foo: ($$anchor, $$slotProps) => {
				var div = root_1();

				$.append($$anchor, div);
			}
		}
	});
}