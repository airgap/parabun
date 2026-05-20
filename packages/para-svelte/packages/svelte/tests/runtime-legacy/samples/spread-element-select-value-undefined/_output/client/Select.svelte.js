import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<select></select> <p> </p>`, 1);

export default function Select($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	const $$restProps = $.legacy_rest_props($$sanitized_props, ['options', 'value', 'label']);

	$.push($$props, false);

	let options = $.prop($$props, 'options', 28, () => []);
	let value = $.prop($$props, 'value', 12, "");
	let label = $.prop($$props, 'label', 12, "");

	var $$exports = {
		get options() {
			return options();
		},

		set options($$value) {
			options($$value);
			$.flush();
		},

		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get label() {
			return label();
		},

		set label($$value) {
			label($$value);
			$.flush();
		}
	};

	var fragment = root();
	var select = $.first_child(fragment);

	$.attribute_effect(select, () => ({ ...$$restProps }));

	$.each(select, 5, options, $.index, ($$anchor, option) => {
		var option_1 = root_1();
		var text = $.child(option_1, true);

		$.reset(option_1);

		var option_1_value = {};

		$.template_effect(() => {
			$.set_text(text, $.get(option));

			if (option_1_value !== (option_1_value = $.get(option))) {
				option_1.__value = $.get(option);
			}
		});

		$.append($$anchor, option_1);
	});

	$.reset(select);

	var p = $.sibling(select, 2);
	var text_1 = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text_1, label()));
	$.bind_select_value(select, value);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}