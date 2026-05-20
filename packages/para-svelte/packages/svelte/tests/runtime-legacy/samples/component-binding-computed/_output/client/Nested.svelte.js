import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<label> <input/></label>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12);
	let field = $.prop($$props, 'field', 12);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get field() {
			return field();
		},

		set field($$value) {
			field($$value);
			$.flush();
		}
	};

	var label = root();
	var text = $.child(label);
	var input = $.sibling(text);

	$.remove_input_defaults(input);
	$.reset(label);
	$.template_effect(() => $.set_text(text, `${field() ?? ''} `));
	$.bind_value(input, value);
	$.append($$anchor, label);

	return $.pop($$exports);
}