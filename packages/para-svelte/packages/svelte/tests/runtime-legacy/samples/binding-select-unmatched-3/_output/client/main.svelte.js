import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<p> </p> <select></select>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let selected = $.prop($$props, 'selected', 12);
	let items = $.prop($$props, 'items', 28, () => ['a', 'b', 'c']);

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
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var select = $.sibling(p, 2);

	$.each(select, 5, items, $.index, ($$anchor, letter) => {
		var option = root_1();
		var text_1 = $.child(option, true);

		$.reset(option);

		var option_value = {};

		$.template_effect(() => {
			$.set_text(text_1, $.get(letter));

			if (option_value !== (option_value = $.get(letter))) {
				option.__value = $.get(letter);
			}
		});

		$.append($$anchor, option);
	});

	$.reset(select);
	$.template_effect(() => $.set_text(text, `selected: ${selected() ?? ''}`));
	$.bind_select_value(select, selected);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}