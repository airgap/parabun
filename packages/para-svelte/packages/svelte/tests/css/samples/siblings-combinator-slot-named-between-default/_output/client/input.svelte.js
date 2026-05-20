import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(`<div class="a svelte-xyz">a</div> <div class="c svelte-xyz">c</div>`, 1);
var root_2 = $.from_html(`<div class="b" slot="wut">b</div>`);

export default function Input($$anchor) {
	Child($$anchor, {
		children: ($$anchor, $$slotProps) => {
			var fragment_1 = root_1();

			$.next(2);
			$.append($$anchor, fragment_1);
		},

		$$slots: {
			default: true,
			wut: ($$anchor, $$slotProps) => {
				var div = root_2();

				$.append($$anchor, div);
			}
		}
	});
}