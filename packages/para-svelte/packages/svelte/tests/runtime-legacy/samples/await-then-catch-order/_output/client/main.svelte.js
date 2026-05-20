import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p>loading...</p>`);
var root_4 = $.from_html(`<p>true!</p>`);
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

	{
		var consequent = ($$anchor) => {
			var p_3 = root_4();

			$.append($$anchor, p_3);
		};

		$.if(node_1, ($$render) => {
			if (true) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}