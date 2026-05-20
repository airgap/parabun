import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	const { bar } = foo();
	let baz = $.prop($$props, 'baz', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get baz() {
			return baz();
		},

		set baz($$value) {
			baz($$value);
			$.flush();
		}
	};

	var h1 = root();
	var text = $.child(h1, true);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, bar));
	$.append($$anchor, h1);

	return $.pop($$exports);
}