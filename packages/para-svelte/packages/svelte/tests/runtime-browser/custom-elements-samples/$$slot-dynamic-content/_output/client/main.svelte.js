import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import "./my-widget.svelte";

var root = $.from_html(`<my-widget><p> </p></my-widget>`, 2);

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

	var my_widget = root();
	var p = $.child(my_widget);
	var text = $.child(p);

	$.reset(p);
	$.reset(my_widget);
	$.template_effect(() => $.set_text(text, `default ${name() ?? ''}`));
	$.append($$anchor, my_widget);

	return $.pop($$exports);
}

$.create_custom_element(_unknown_, { name: {} }, [], [], { mode: 'open' });