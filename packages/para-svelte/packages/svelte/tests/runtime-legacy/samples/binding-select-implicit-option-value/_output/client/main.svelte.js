import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<select></select> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let values = $.prop($$props, 'values', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get values() {
			return values();
		},

		set values($$value) {
			values($$value);
			$.flush();
		}
	};

	var fragment = root();
	var select = $.first_child(fragment);

	$.each(select, 5, values, $.index, ($$anchor, v) => {
		var option = root_1();
		var text = $.child(option, true);

		$.reset(option);

		var option_value = {};

		$.template_effect(() => {
			$.set_text(text, $.get(v));

			if (option_value !== (option_value = $.get(v))) {
				option.__value = $.get(v);
			}
		});

		$.append($$anchor, option);
	});

	$.reset(select);

	var p = $.sibling(select, 2);
	var text_1 = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text_1, `foo: ${foo() ?? ''}`));
	$.bind_select_value(select, foo);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}