import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p>loading...</p>`);
var root = $.from_html(`<div><!></div>`);

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

	var div = root();
	var node = $.child(div);

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

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}