import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/> <input/>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);
	let b = $.prop($$props, 'b', 12);

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get b() {
			return b();
		},

		set b($$value) {
			b($$value);
			$.flush();
		}
	};

	var fragment = root();
	var input = $.first_child(fragment);
	var input_1 = $.sibling(input, 2);

	$.bind_focused(input, a);
	$.bind_focused(input_1, b);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}