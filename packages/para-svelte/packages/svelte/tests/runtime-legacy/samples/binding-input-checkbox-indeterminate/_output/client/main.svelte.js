import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input type="checkbox"/> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let checked = $.prop($$props, 'checked', 12);
	let indeterminate = $.prop($$props, 'indeterminate', 12);

	var $$exports = {
		get checked() {
			return checked();
		},

		set checked($$value) {
			checked($$value);
			$.flush();
		},

		get indeterminate() {
			return indeterminate();
		},

		set indeterminate($$value) {
			indeterminate($$value);
			$.flush();
		}
	};

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var p = $.sibling(input, 2);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, `checked? ${checked() ?? ''}`);
		$.set_text(text_1, `indeterminate? ${indeterminate() ?? ''}`);
	});

	$.bind_checked(input, checked);
	$.bind_property('indeterminate', 'change', input, indeterminate, indeterminate);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}