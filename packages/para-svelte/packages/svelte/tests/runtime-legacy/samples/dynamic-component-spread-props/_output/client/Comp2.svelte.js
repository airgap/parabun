import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <p> </p> <p> </p>`, 1);

export default function Comp2($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12);
	let foo = $.prop($$props, 'foo', 12);
	let cb = $.prop($$props, 'cb', 12);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get cb() {
			return cb();
		},

		set cb($$value) {
			cb($$value);
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

	var p_2 = $.sibling(p_1, 2);
	var text_2 = $.child(p_2);

	$.reset(p_2);

	$.template_effect(() => {
		$.set_text(text, `value(2) = ${value() ?? ''}`);
		$.set_text(text_1, `foo=${foo() ?? ''}`);
		$.set_text(text_2, `typeof cb=${typeof cb()}`);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}