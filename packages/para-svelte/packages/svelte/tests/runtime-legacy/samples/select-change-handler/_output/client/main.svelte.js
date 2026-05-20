import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<select></select>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let selected = $.prop($$props, 'selected', 12);
	let options = $.prop($$props, 'options', 12);
	let lastChangedTo = $.prop($$props, 'lastChangedTo', 12);

	function updateLastChangedTo(result) {
		lastChangedTo(result);
	}

	var $$exports = {
		updateLastChangedTo,
		get selected() {
			return selected();
		},

		set selected($$value) {
			selected($$value);
			$.flush();
		},

		get options() {
			return options();
		},

		set options($$value) {
			options($$value);
			$.flush();
		},

		get lastChangedTo() {
			return lastChangedTo();
		},

		set lastChangedTo($$value) {
			lastChangedTo($$value);
			$.flush();
		}
	};

	var select = root();

	$.each(select, 5, options, $.index, ($$anchor, option) => {
		var option_1 = root_1();
		var text = $.child(option_1, true);

		$.reset(option_1);

		var option_1_value = {};

		$.template_effect(() => {
			$.set_text(text, ($.get(option), $.untrack(() => $.get(option).id)));

			if (option_1_value !== (option_1_value = ($.get(option), $.untrack(() => $.get(option).id)))) {
				option_1.value = (option_1.__value = ($.get(option), $.untrack(() => $.get(option).id))) ?? '';
			}
		});

		$.append($$anchor, option_1);
	});

	$.reset(select);
	$.bind_select_value(select, selected);
	$.event('change', select, () => updateLastChangedTo(selected()));
	$.append($$anchor, select);
	$.bind_prop($$props, 'updateLastChangedTo', updateLastChangedTo);

	return $.pop($$exports);
}