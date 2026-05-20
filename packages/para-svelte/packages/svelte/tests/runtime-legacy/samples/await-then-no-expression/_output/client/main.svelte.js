import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>the promise is resolved</p>`);
var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p>the promise is resolved</p>`);
var root_4 = $.from_html(`<p>the promise is resolved</p>`);
var root_5 = $.from_html(`<p>the promise is pending</p>`);
var root = $.from_html(`<!> <br/> <!> <br/> <!>`, 1);

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
		null,
		($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		},
		($$anchor, theError) => {
			var p_1 = root_2();
			var text = $.child(p_1);

			$.reset(p_1);

			$.template_effect(() => $.set_text(text, `oh no! ${(
				$.deep_read_state($.get(theError)),
				$.untrack(() => $.get(theError).message)
			) ?? ''}`));

			$.append($$anchor, p_1);
		}
	);

	var node_1 = $.sibling(node, 4);

	$.await(node_1, thePromise, null, ($$anchor) => {
		var p_2 = root_3();

		$.append($$anchor, p_2);
	});

	var node_2 = $.sibling(node_1, 4);

	$.await(
		node_2,
		thePromise,
		($$anchor) => {
			var p_4 = root_5();

			$.append($$anchor, p_4);
		},
		($$anchor) => {
			var p_3 = root_4();

			$.append($$anchor, p_3);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}