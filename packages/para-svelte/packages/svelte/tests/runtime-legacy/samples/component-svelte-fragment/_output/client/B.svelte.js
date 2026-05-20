import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>Hello</div> <div> </div>`, 1);

export default function B($$anchor, $$props) {
	$.push($$props, false);

	let name = $.prop($$props, 'name', 12);

	var $$exports = {
		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.sibling($.first_child(fragment), 2);
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, name()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}