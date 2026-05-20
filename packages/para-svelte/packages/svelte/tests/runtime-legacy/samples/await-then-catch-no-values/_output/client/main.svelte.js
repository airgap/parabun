import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

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

	$.await(
		node,
		thePromise,
		($$anchor) => {
			var text_2 = $.text('waiting');

			$.append($$anchor, text_2);
		},
		($$anchor) => {
			var text = $.text('resolved');

			$.append($$anchor, text);
		},
		($$anchor) => {
			var text_1 = $.text('rejected');

			$.append($$anchor, text_1);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}