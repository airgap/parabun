import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<select><option>option 1</option><option>option 2</option></select>`);

export default function Select($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12);
	let other = $.prop($$props, 'other', 12);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get other() {
			return other();
		},

		set other($$value) {
			other($$value);
			$.flush();
		}
	};

	var select = root();

	$.attribute_effect(select, () => ({ multiple: true, ...other() }));

	var option = $.child(select);

	option.value = option.__value = '1';

	var option_1 = $.sibling(option);

	option_1.value = option_1.__value = '2';
	$.reset(select);
	$.bind_select_value(select, value);
	$.append($$anchor, select);

	return $.pop($$exports);
}