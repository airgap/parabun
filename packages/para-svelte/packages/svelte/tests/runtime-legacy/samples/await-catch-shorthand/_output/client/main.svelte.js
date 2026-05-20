import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

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

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(node, thePromise, null, void 0, ($$anchor, theError) => {
		var p = root_1();
		var text = $.child(p);

		$.reset(p);

		$.template_effect(() => $.set_text(text, `oh no! ${(
			$.deep_read_state($.get(theError)),
			$.untrack(() => $.get(theError).message)
		) ?? ''}`));

		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}