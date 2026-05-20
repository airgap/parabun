import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div class="b svelte-xyz"></div>`);
var root_2 = $.from_html(`<div class="c svelte-xyz"></div>`);
var root_3 = $.from_html(`<div class="e svelte-xyz"></div>`);
var root_4 = $.from_html(`<div class="d svelte-xyz"></div>`);
var root_5 = $.from_html(`<div class="g svelte-xyz"></div>`);
var root_6 = $.from_html(`<div class="f svelte-xyz"></div>`);
var root = $.from_html(`<div class="a svelte-xyz"></div> <!> <!> <!> <div class="h svelte-xyz"></div>`, 1);

export default function Input($$anchor) {
	let promise = Promise.resolve();
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	$.await(
		node,
		() => promise,
		null,
		($$anchor, value) => {
			var div = root_1();

			$.append($$anchor, div);
		},
		($$anchor, error) => {
			var div_1 = root_2();

			$.append($$anchor, div_1);
		}
	);

	var node_1 = $.sibling(node, 2);

	$.await(
		node_1,
		() => promise,
		($$anchor) => {
			var div_3 = root_4();

			$.append($$anchor, div_3);
		},
		void 0,
		($$anchor, error) => {
			var div_2 = root_3();

			$.append($$anchor, div_2);
		}
	);

	var node_2 = $.sibling(node_1, 2);

	$.await(
		node_2,
		() => promise,
		($$anchor) => {
			var div_5 = root_6();

			$.append($$anchor, div_5);
		},
		($$anchor, error) => {
			var div_4 = root_5();

			$.append($$anchor, div_4);
		}
	);

	$.next(2);
	$.append($$anchor, fragment);
}