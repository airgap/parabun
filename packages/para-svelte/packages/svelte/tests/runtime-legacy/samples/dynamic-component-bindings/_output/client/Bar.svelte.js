import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>bar</p> <input type="checkbox"/>`, 1);

export default function Bar($$anchor, $$props) {
	$.push($$props, false);

	let z = $.prop($$props, 'z', 12);

	var $$exports = {
		get z() {
			return z();
		},

		set z($$value) {
			z($$value);
			$.flush();
		}
	};

	var fragment = root();
	var input = $.sibling($.first_child(fragment), 2);

	$.remove_input_defaults(input);
	$.bind_checked(input, z);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}