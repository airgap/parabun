import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12);
	let props = $.prop($$props, 'props', 12);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		}
	};

	var input = root();

	$.attribute_effect(input, () => ({ ...props() }), void 0, void 0, void 0, void 0, true);
	$.bind_value(input, value);
	$.append($$anchor, input);

	return $.pop($$exports);
}