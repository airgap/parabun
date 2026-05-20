import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div>`);

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

	var div = root();
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, value()));
	$.append($$anchor, div);

	return $.pop($$exports);
}