import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>oh no! Something broke!</p>`);
var root_2 = $.from_html(`<p>oh no! Something broke!</p>`);
var root_3 = $.from_html(`<p>the promise is pending</p>`);
var root = $.from_html(`<!> <br/> <!>`, 1);

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

	$.await(node, thePromise, null, void 0, ($$anchor) => {
		var p = root_1();

		$.append($$anchor, p);
	});

	var node_1 = $.sibling(node, 4);

	$.await(
		node_1,
		thePromise,
		($$anchor) => {
			var p_2 = root_3();

			$.append($$anchor, p_2);
		},
		void 0,
		($$anchor) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}