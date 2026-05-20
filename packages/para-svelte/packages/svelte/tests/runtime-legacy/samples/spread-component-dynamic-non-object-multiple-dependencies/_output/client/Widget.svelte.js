import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p>`, 1);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let baz = $.prop($$props, 'baz', 12);
	let qux = $.prop($$props, 'qux', 12);
	let corge = $.prop($$props, 'corge', 12);

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
		},

		get qux() {
			return qux();
		},

		set qux($$value) {
			qux($$value);
			$.flush();
		},

		get corge() {
			return corge();
		},

		set corge($$value) {
			corge($$value);
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

	var p_3 = $.sibling(p_2, 2);
	var text_3 = $.child(p_3);

	$.reset(p_3);

	$.template_effect(() => {
		$.set_text(text, `foo: ${foo() ?? ''}`);
		$.set_text(text_1, `baz: ${baz() ?? ''}`);
		$.set_text(text_2, `qux: ${qux() ?? ''}`);
		$.set_text(text_3, `corge: ${corge() ?? ''}`);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}