import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<textarea></textarea> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
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
	var textarea = $.first_child(fragment);

	$.remove_textarea_child(textarea);

	var p = $.sibling(textarea, 2);
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, value()));
	$.bind_value(textarea, value);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}