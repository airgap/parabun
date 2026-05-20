import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import "./my-widget.svelte";

var root = $.from_html(`<my-widget></my-widget>`, 2);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 28, () => ["a", "b", "c"]);
	let flagged = $.prop($$props, 'flagged', 12, false);

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		},

		get flagged() {
			return flagged();
		},

		set flagged($$value) {
			flagged($$value);
			$.flush();
		}
	};

	var my_widget = root();

	$.set_class(my_widget, 1, 'foo');
	$.template_effect(() => $.set_custom_element_data(my_widget, 'items', items()));
	$.template_effect(() => $.set_custom_element_data(my_widget, 'flag1', flagged()));
	$.set_custom_element_data(my_widget, 'flag2', true);
	$.append($$anchor, my_widget);

	return $.pop($$exports);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, { items: {}, flagged: {} }, [], [], { mode: 'open' }));