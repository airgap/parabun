import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Widget($$anchor, $$props) {
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

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `foo: ${foo() ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}