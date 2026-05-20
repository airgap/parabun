import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input type="text"/> <textarea></textarea> <input type="checkbox"/> <button> </button>`, 1);

export default function Main($$anchor) {
	let count = $.mutable_source(0);
	let value = { value: "" };
	let checked = { value: false };
	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var textarea = $.sibling(input, 2);

	$.remove_textarea_child(textarea);

	var input_1 = $.sibling(textarea, 2);

	$.remove_input_defaults(input_1);

	var button = $.sibling(input_1, 2);
	var text = $.child(button, true);

	$.reset(button);

	$.template_effect(() => {
		$.set_value(input, ($.untrack(() => value.value)));
		$.set_value(textarea, ($.untrack(() => value.value)));
		$.set_checked(input_1, ($.untrack(() => checked.value)));
		$.set_text(text, $.get(count));
	});

	$.event('click', button, () => $.update(count));
	$.append($$anchor, fragment);
}