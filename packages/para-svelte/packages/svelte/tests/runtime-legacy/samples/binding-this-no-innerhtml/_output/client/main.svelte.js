import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><canvas></canvas></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var div = root();
	var canvas = $.child(div);

	$.bind_this(canvas, ($$value) => foo($$value), () => foo());
	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}