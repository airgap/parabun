import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let prop = $.prop($$props, 'prop', 12);

	var $$exports = {
		get prop() {
			return prop();
		},

		set prop($$value) {
			prop($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, prop()));
	$.append($$anchor, p);

	return $.pop($$exports);
}

$.create_custom_element(_unknown_, { prop: {} }, [], [], { mode: 'open' });