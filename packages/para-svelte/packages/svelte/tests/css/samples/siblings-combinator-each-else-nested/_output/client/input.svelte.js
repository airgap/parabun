import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div class="c svelte-xyz"></div>`);
var root_3 = $.from_html(`<div class="d svelte-xyz"></div>`);
var root_1 = $.from_html(`<div class="b svelte-xyz"></div> <!>`, 1);
var root_5 = $.from_html(`<div class="e svelte-xyz"></div>`);
var root_6 = $.from_html(`<div class="f svelte-xyz"></div>`);
var root_9 = $.from_html(`<div class="h svelte-xyz"></div>`);
var root_10 = $.from_html(`<div class="i svelte-xyz"></div>`);
var root_7 = $.from_html(`<div class="g svelte-xyz"></div> <!> <div class="j svelte-xyz"></div>`, 1);
var root_12 = $.from_html(`<div class="l svelte-xyz"></div>`);
var root_13 = $.from_html(`<div class="m svelte-xyz"></div>`);
var root = $.from_html(`<div class="a svelte-xyz"></div> <!> <!> <!> <div class="k svelte-xyz"></div> <!>`, 1);

export default function Input($$anchor) {
	let array = [];
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	$.each(node, 1, () => array, $.index, ($$anchor, a) => {
		var fragment_1 = root_1();
		var node_1 = $.sibling($.first_child(fragment_1), 2);

		$.each(
			node_1,
			1,
			() => array,
			$.index,
			($$anchor, b) => {
				var div = root_2();

				$.append($$anchor, div);
			},
			($$anchor) => {
				var div_1 = root_3();

				$.append($$anchor, div_1);
			}
		);

		$.append($$anchor, fragment_1);
	});

	var node_2 = $.sibling(node, 2);

	$.each(
		node_2,
		1,
		() => array,
		$.index,
		($$anchor, c) => {
			var fragment_2 = $.comment();
			var node_3 = $.first_child(fragment_2);

			$.each(node_3, 1, () => array, $.index, ($$anchor, d) => {
				var div_2 = root_5();

				$.append($$anchor, div_2);
			});

			$.append($$anchor, fragment_2);
		},
		($$anchor) => {
			var div_3 = root_6();

			$.append($$anchor, div_3);
		}
	);

	var node_4 = $.sibling(node_2, 2);

	$.each(node_4, 1, () => array, $.index, ($$anchor, item) => {
		var fragment_3 = root_7();
		var node_5 = $.sibling($.first_child(fragment_3), 2);

		$.each(
			node_5,
			1,
			() => array,
			$.index,
			($$anchor, item, $$index_5, $$array) => {
				var fragment_4 = $.comment();
				var node_6 = $.first_child(fragment_4);

				$.each(node_6, 1, () => array, $.index, ($$anchor, item, $$index_4, $$array_1) => {
					var div_4 = root_9();

					$.append($$anchor, div_4);
				});

				$.append($$anchor, fragment_4);
			},
			($$anchor) => {
				var div_5 = root_10();

				$.append($$anchor, div_5);
			}
		);

		$.next(2);
		$.append($$anchor, fragment_3);
	});

	var node_7 = $.sibling(node_4, 4);

	$.each(node_7, 1, () => array, $.index, ($$anchor, item) => {
		var fragment_5 = $.comment();
		var node_8 = $.first_child(fragment_5);

		$.each(
			node_8,
			1,
			() => array,
			$.index,
			($$anchor, item, $$index_7, $$array_2) => {
				var div_6 = root_12();

				$.append($$anchor, div_6);
			},
			($$anchor) => {
				var div_7 = root_13();

				$.append($$anchor, div_7);
			}
		);

		$.append($$anchor, fragment_5);
	});

	$.append($$anchor, fragment);
}