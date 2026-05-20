import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<p> </p> <select><option disabled="">x</option><!></select>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let selected = $.prop($$props, 'selected', 12);

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
	var node = $.sibling($.child(select));

	$.each(node, 0, () => ["a", "b", "c"], $.index, ($$anchor, val) => {
		var option = root_1();
		var text_1 = $.child(option, true);

		$.reset(option);

		var option_value = {};

		$.template_effect(() => {
			$.set_text(text_1, val);

			if (option_value !== (option_value = val)) {
				option.__value = val;
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