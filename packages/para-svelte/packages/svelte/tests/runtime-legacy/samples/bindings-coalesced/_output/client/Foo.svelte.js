import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <p> </p>`, 1);

export default function Foo($$anchor, $$props) {
	$.push($$props, false);

	let bar = $.prop($$props, 'bar', 12, 1);
	let baz = $.prop($$props, 'baz', 12, 2);

	function double() {
		bar(bar() * 2);
		baz(baz() * 2);
	}

	var $$exports = {
		double,
		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
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

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, `bar in Foo: ${bar() ?? ''}`);
		$.set_text(text_1, `baz in Foo: ${baz() ?? ''}`);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'double', double);

	return $.pop($$exports);
}