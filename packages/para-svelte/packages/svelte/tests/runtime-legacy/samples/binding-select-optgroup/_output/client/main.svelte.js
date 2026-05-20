import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1> <select><option>Harry</option><optgroup label="Group"><option>World</option></optgroup></select>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let name = $.prop($$props, 'name', 12);

	var $$exports = {
		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
			$.flush();
		}
	};

	var fragment = root();
	var h1 = $.first_child(fragment);
	var text = $.child(h1);

	$.reset(h1);

	var select = $.sibling(h1, 2);
	var option = $.child(select);

	option.value = option.__value = 'Harry';

	var optgroup = $.sibling(option);
	var option_1 = $.child(optgroup);

	option_1.value = option_1.__value = 'World';
	$.reset(optgroup);
	$.reset(select);
	$.template_effect(() => $.set_text(text, `Hello ${name() ?? ''}!`));
	$.bind_select_value(select, name);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}