import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <p> </p> <p> </p>`, 1);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let i = $.prop($$props, 'i', 12);
	let foo = $.prop($$props, 'foo', 12);
	let qux = $.prop($$props, 'qux', 12);

	var $$exports = {
		get i() {
			return i();
		},

		set i($$value) {
			i($$value);
			$.flush();
		},

		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get qux() {
			return qux();
		},

		set qux($$value) {
			qux($$value);
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
		$.set_text(text, `i: ${i() ?? ''}`);
		$.set_text(text_1, `foo: ${foo() ?? ''}`);
		$.set_text(text_2, `qux: ${qux() ?? ''}`);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}