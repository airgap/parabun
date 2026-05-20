import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<input/> <p> </p>`, 1), Main[$.FILENAME], [[5, 0], [6, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	let object = $.mutable_source({ value: 'hello' });
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var p = $.sibling(input, 2);
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, ($.get(object), $.untrack(() => $.get(object).value))));

	$.bind_value(
		input,
		function get() {
			return $.get(object).value;
		},
		function set($$value) {
			$.mutate(object, $.get(object).value = $$value);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}