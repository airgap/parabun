import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<p> </p> <select></select> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	// set as null so no option will be selected by default
	let selected = $.prop($$props, 'selected', 12, null);

	var $$exports = {
		get selected() {
			return selected();
		},

		set selected($$value) {
			selected($$value);
			$.flush();
		}
	};

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var select = $.sibling(p, 2);

	$.each(select, 4, () => ['a', 'b', 'c'], $.index, ($$anchor, letter) => {
		var option = root_1();
		var text_1 = $.child(option, true);

		$.reset(option);

		var option_value = {};

		$.template_effect(() => {
			$.set_text(text_1, letter);

			if (option_value !== (option_value = letter)) {
				option.__value = letter;
			}
		});

		$.append($$anchor, option);
	});

	$.reset(select);

	var p_1 = $.sibling(select, 2);
	var text_2 = $.child(p_1);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, `selected: ${selected() ?? ''}`);
		$.set_text(text_2, `selected: ${selected() ?? ''}`);
	});

	$.bind_select_value(select, selected);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}