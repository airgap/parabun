import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> <!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let thePromise = $.prop($$props, 'thePromise', 12);
	let error = $.prop($$props, 'error', 12);

	var $$exports = {
		get thePromise() {
			return thePromise();
		},

		set thePromise($$value) {
			thePromise($$value);
			$.flush();
		},

		get error() {
			return error();
		},

		set error($$value) {
			error($$value);
			$.flush();
		}
	};

	var div = root();
	var text = $.child(div);
	var node = $.sibling(text);

	$.await(
		node,
		thePromise,
		null,
		($$anchor, _) => {
			var text_1 = $.text();

			$.template_effect(() => $.set_text(text_1, `After Resolve: ${error() ?? ''}`));
			$.append($$anchor, text_1);
		},
		($$anchor, error) => {
			var text_2 = $.text();

			$.template_effect(() => $.set_text(text_2, `Rejected: ${$.get(error) ?? ''}`));
			$.append($$anchor, text_2);
		}
	);

	$.reset(div);
	$.template_effect(() => $.set_text(text, `error: ${error() ?? ''} `));
	$.append($$anchor, div);

	return $.pop($$exports);
}