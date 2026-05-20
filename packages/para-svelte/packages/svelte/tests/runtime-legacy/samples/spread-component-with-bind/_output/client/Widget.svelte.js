import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <input/>`, 1);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var input = $.sibling(p, 2);

	$.remove_input_defaults(input);
	$.template_effect(() => $.set_text(text, value()));
	$.bind_value(input, value);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}