import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import One from './One.svelte';

var root_1 = $.from_html(`<div slot="a">a</div>`);

export default function Main($$anchor) {
	One($$anchor, {
		$$slots: {
			a: ($$anchor, $$slotProps) => {
				var div = root_1();

				$.append($$anchor, div);
			}
		}
	});
}