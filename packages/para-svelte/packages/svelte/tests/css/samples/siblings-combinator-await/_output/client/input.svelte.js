import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div class="c svelte-xyz"></div>`);
var root_2 = $.from_html(`<div class="d svelte-xyz"></div>`);
var root_3 = $.from_html(`<div class="b svelte-xyz"></div>`);
var root = $.from_html(`<div class="a svelte-xyz"></div> <!> <div class="e svelte-xyz"></div>`, 1);

export default function Input($$anchor) {
	let promise = Promise.resolve();
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	$.await(
		node,
		() => promise,
		($$anchor) => {
			var div_2 = root_3();

			$.append($$anchor, div_2);
		},
		($$anchor, value) => {
			var div = root_1();

			$.append($$anchor, div);
		},
		($$anchor, error) => {
			var div_1 = root_2();

			$.append($$anchor, div_1);
		}
	);

	$.next(2);
	$.append($$anchor, fragment);
}