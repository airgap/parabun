import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<select></select>`);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let options = $.prop($$props, 'options', 28, () => []);
	let index = $.prop($$props, 'index', 12, 0);
	let value = $.prop($$props, 'value', 12);

	$.legacy_pre_effect(() => ($.deep_read_state(options()), $.deep_read_state(index())), () => {
		value(options()[index()]);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get options() {
			return options();
		},

		set options($$value) {
			options($$value);
			$.flush();
		},

		get index() {
			return index();
		},

		set index($$value) {
			index($$value);
			$.flush();
		},

		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.init();

	var select = root();

	$.each(select, 5, options, $.index, ($$anchor, option, i) => {
		var option_1 = root_1();
		var text = $.child(option_1, true);

		$.reset(option_1);
		option_1.value = option_1.__value = i;
		$.template_effect(() => $.set_text(text, $.get(option)));
		$.append($$anchor, option_1);
	});

	$.reset(select);
	$.bind_select_value(select, index);
	$.append($$anchor, select);

	return $.pop($$exports);
}