import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let node = $.mutable_source();
	let value = $.prop($$props, 'value', 12, 'initial');

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
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);
	$.bind_this(input, ($$value) => $.set(node, $$value), () => $.get(node));

	var p = $.sibling(input, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `value: ${value() ?? ''}`));
	$.bind_value(input, value);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}