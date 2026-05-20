import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p> </p>`);
var root_4 = $.from_html(`<p>loading...</p>`);

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

	Foo($$anchor, {
		children: ($$anchor, $$slotProps) => {
			var fragment_1 = $.comment();
			var node = $.first_child(fragment_1);

			$.await(
				node,
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
		},
		$$slots: { default: true }
	});

	return $.pop($$exports);
}