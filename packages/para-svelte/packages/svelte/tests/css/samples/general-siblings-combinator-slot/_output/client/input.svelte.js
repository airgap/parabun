import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div class="b svelte-xyz" slot="a"></div>`);
var root_2 = $.from_html(`<div class="c" slot="b"><div class="d svelte-xyz"></div> <div class="e svelte-xyz"></div></div>`);
var root_3 = $.from_html(`<div class="f svelte-xyz" slot="c"></div>`);
var root = $.from_html(`<div class="a svelte-xyz"></div> <!> <div class="g svelte-xyz"></div>`, 1);

export default function Input($$anchor) {
	let App;
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	App(node, {
		$$slots: {
			a: ($$anchor, $$slotProps) => {
				var div = root_1();

				$.append($$anchor, div);
			},

			b: ($$anchor, $$slotProps) => {
				var div_1 = root_2();

				$.append($$anchor, div_1);
			},

			c: ($$anchor, $$slotProps) => {
				var div_2 = root_3();

				$.append($$anchor, div_2);
			}
		}
	});

	$.next(2);
	$.append($$anchor, fragment);
}