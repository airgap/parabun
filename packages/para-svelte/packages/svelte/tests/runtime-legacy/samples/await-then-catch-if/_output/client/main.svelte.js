import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p> </p>`);
var root_4 = $.from_html(`<p>loading...</p>`);
var root_5 = $.from_html(`<p>Else</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let show = $.prop($$props, 'show', 12);
	let thePromise = $.prop($$props, 'thePromise', 12);

	var $$exports = {
		get show() {
			return show();
		},

		set show($$value) {
			show($$value);
			$.flush();
		},

		get thePromise() {
			return thePromise();
		},

		set thePromise($$value) {
			thePromise($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.await(
				node_1,
				thePromise,
				($$anchor) => {
					var p_2 = root_4();

					$.append($$anchor, p_2);
				},
				($$anchor, theValue) => {
					var p = root_2();
					var text = $.child(p);

					$.reset(p);
					$.template_effect(() => $.set_text(text, `the value is ${$.get(theValue) ?? ''}`));
					$.append($$anchor, p);
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

			$.append($$anchor, fragment_1);
		};

		var alternate = ($$anchor) => {
			var p_3 = root_5();

			$.append($$anchor, p_3);
		};

		$.if(node, ($$render) => {
			if (show()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}