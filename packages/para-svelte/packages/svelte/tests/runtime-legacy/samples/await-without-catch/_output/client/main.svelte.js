import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loaded</p>`);
var root_2 = $.from_html(`<p>loading...</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let promise = $.prop($$props, 'promise', 12);

	var $$exports = {
		get promise() {
			return promise();
		},

		set promise($$value) {
			promise($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(
		node,
		promise,
		($$anchor) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		},
		($$anchor, value) => {
			var p = root_1();

			$.append($$anchor, p);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}