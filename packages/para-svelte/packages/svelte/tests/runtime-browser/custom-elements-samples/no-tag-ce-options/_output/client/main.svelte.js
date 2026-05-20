import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1>`);

export default function _unknown_($$anchor, $$props) {
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

	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, `Hello ${name() ?? ''}!`));
	$.append($$anchor, h1);

	return $.pop($$exports);
}

$.create_custom_element(_unknown_, { name: {} }, [], []);