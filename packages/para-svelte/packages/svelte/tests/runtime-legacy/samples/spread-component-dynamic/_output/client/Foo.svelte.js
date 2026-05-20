import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Foo($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `a: ${a() ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}