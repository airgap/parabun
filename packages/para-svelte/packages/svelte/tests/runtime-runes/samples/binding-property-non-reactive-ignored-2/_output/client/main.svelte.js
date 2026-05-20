import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<input/>`), Main[$.FILENAME], [[6, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let arr = [];
	var $$exports = { ...$.legacy_api() };
	var input = root();

	$.remove_input_defaults(input);

	$.bind_value(
		input,
		function get() {
			return arr[0];
		},
		function set($$value) {
			arr[0] = $$value;
		}
	);

	$.append($$anchor, input);

	return $.pop($$exports);
}