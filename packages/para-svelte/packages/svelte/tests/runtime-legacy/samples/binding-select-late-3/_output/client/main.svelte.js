import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<select></select> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let selected = $.prop($$props, 'selected', 12);
	let items = $.prop($$props, 'items', 12);

	var $$exports = {
		get selected() {
			return selected();
		},

		set selected($$value) {
			selected($$value);
			$.flush();
		},

		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	var fragment = root();
	var select = $.first_child(fragment);

	$.each(select, 5, items, $.index, ($$anchor, item) => {
		var option = root_1();
		var text = $.child(option, true);

		$.reset(option);

		var option_value = {};

		$.template_effect(() => {
			$.set_text(text, $.get(item));

			if (option_value !== (option_value = $.get(item))) {
				option.__value = $.get(item);
			}
		});

		$.append($$anchor, option);
	});

	$.reset(select);

	var select_value;

	$.init_select(select);

	var p = $.sibling(select, 2);
	var text_1 = $.child(p);

	$.reset(p);

	$.template_effect(() => {
		if (select_value !== (select_value = selected())) {
			(
				select.value = (select.__value = selected()) ?? '',
				$.select_option(select, selected())
			);
		}

		$.set_text(text_1, `selected: ${(selected() || 'nothing') ?? ''}`);
	});

	$.event('blur', select, (e) => selected(e.target.value));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}