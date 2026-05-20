import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<input type="number"/>`), Child[$.FILENAME], [[5, 0]]);

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	let value = $.prop($$props, 'value', 15);
	var $$exports = { ...$.legacy_api() };
	var input = root();

	$.remove_input_defaults(input);

	$.bind_value(
		input,
		function get() {
			return value();
		},
		function set($$value) {
			value($$value);
		}
	);

	$.append($$anchor, input);

	return $.pop($$exports);
}