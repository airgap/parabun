import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<select><option>Hello</option><option>World</option></select>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12, 'World');
	let spread = $.prop($$props, 'spread', 28, () => ({}));

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get spread() {
			return spread();
		},

		set spread($$value) {
			spread($$value);
			$.flush();
		}
	};

	var select = root();

	$.attribute_effect(select, () => ({ value: value(), ...spread() }));
	$.append($$anchor, select);

	return $.pop($$exports);
}