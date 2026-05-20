import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>Hello world!</h1>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let h1 = $.prop($$props, 'h1', 12);

	var $$exports = {
		get h1() {
			return h1();
		},

		set h1($$value) {
			h1($$value);
			$.flush();
		}
	};

	var h1_1 = root();

	$.bind_this(h1_1, ($$value) => h1($$value), () => h1());
	$.append($$anchor, h1_1);

	return $.pop($$exports);
}