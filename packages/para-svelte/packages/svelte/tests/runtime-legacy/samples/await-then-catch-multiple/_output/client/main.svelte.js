import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p>loading...</p>`);
var root_4 = $.from_html(`<p> </p>`);
var root_5 = $.from_html(`<p> </p>`);
var root_6 = $.from_html(`<p>loading...</p>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let thePromise = $.prop($$props, 'thePromise', 12);

	var $$exports = {
		get thePromise() {
			return thePromise();
		},

		set thePromise($$value) {
			thePromise($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.await(
		node,
		thePromise,
		($$anchor) => {
			var p_2 = root_3();

			$.append($$anchor, p_2);
		},
		($$anchor, theValue) => {
			var p = root_1();
			var text = $.child(p);

			$.reset(p);
			$.template_effect(() => $.set_text(text, `the value is ${$.get(theValue) ?? ''}`));
			$.append($$anchor, p);
		},
		($$anchor, theError) => {
			var p_1 = root_2();
			var text_1 = $.child(p_1);

			$.reset(p_1);

			$.template_effect(() => $.set_text(text_1, `oh no! ${(
				$.deep_read_state($.get(theError)),
				$.untrack(() => $.get(theError).message)
			) ?? ''}`));

			$.append($$anchor, p_1);
		}
	);

	var node_1 = $.sibling(node, 2);

	$.await(
		node_1,
		thePromise,
		($$anchor) => {
			var p_5 = root_6();

			$.append($$anchor, p_5);
		},
		($$anchor, theValue) => {
			var p_3 = root_4();
			var text_2 = $.child(p_3);

			$.reset(p_3);
			$.template_effect(() => $.set_text(text_2, `the value is ${$.get(theValue) ?? ''}`));
			$.append($$anchor, p_3);
		},
		($$anchor, theError) => {
			var p_4 = root_5();
			var text_3 = $.child(p_4);

			$.reset(p_4);

			$.template_effect(() => $.set_text(text_3, `oh no! ${(
				$.deep_read_state($.get(theError)),
				$.untrack(() => $.get(theError).message)
			) ?? ''}`));

			$.append($$anchor, p_4);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}