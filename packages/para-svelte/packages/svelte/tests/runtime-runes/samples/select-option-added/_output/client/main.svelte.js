import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<button>add option</button> <p> </p> <select></select>`, 1);

export default function Main($$anchor) {
	let options = $.proxy([1, 2, 3]);
	let selected = $.state(1);
	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p);

	$.reset(p);

	var select = $.sibling(p, 2);

	$.each(select, 21, () => options, $.index, ($$anchor, o) => {
		var option = root_1();
		var text_1 = $.child(option, true);

		$.reset(option);

		var option_value = {};

		$.template_effect(() => {
			$.set_text(text_1, $.get(o));

			if (option_value !== (option_value = $.get(o))) {
				option.__value = $.get(o);
			}
		});

		$.append($$anchor, option);
	});

	$.reset(select);
	$.template_effect(() => $.set_text(text, `selected: ${$.get(selected) ?? ''}`));
	$.delegated('click', button, () => options.push(options.length + 1));
	$.bind_select_value(select, () => $.get(selected), ($$value) => $.set(selected, $$value));
	$.append($$anchor, fragment);
}

$.delegate(['click']);