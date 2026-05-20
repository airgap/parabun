import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span> </span>`);

export default function Hello($$anchor, $$props) {
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

	var span = root();
	var text = $.child(span);

	$.reset(span);
	$.template_effect(() => $.set_text(text, `Hello ${name() ?? ''}`));
	$.append($$anchor, span);

	return $.pop($$exports);
}