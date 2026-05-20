import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p> </p>`);
var root_4 = $.from_html(`<p>loading...</p>`);
var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let thePromise = $.prop($$props, 'thePromise', 12);
	let show = $.prop($$props, 'show', 12);

	var $$exports = {
		get thePromise() {
			return thePromise();
		},

		set thePromise($$value) {
			thePromise($$value);
			$.flush();
		},

		get show() {
			return show();
		},

		set show($$value) {
			show($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	$.await(
		node,
		thePromise,
		($$anchor) => {
			var p_2 = root_4();

			$.append($$anchor, p_2);
		},
		($$anchor, theValue) => {
			var fragment = $.comment();
			var node_1 = $.first_child(fragment);

			{
				var consequent = ($$anchor) => {
					var p = root_2();
					var text = $.child(p);

					$.reset(p);
					$.template_effect(() => $.set_text(text, `the value is ${$.get(theValue) ?? ''}`));
					$.append($$anchor, p);
				};

				$.if(node_1, ($$render) => {
					if (show()) $$render(consequent);
				});
			}

			$.append($$anchor, fragment);
		},
		($$anchor, theError) => {
			var p_1 = root_3();
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