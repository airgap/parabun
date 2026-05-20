import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/tracing';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button> <input type="checkbox"/>`, 1), Main[$.FILENAME], [[15, 0], [16, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(0), 'count');
	let double = $.tag($.derived(() => $.get(count) * 2), 'double');
	let checked = $.tag($.state(false), 'checked');

	$.user_effect(() => {
		return $.trace(() => 'effect', () => {
			$.get(double);
			$.get(double) >= 4 || $.get(checked);
		});
	});

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var input = $.sibling(button, 2);

	$.remove_input_defaults(input);
	$.template_effect(() => $.set_text(text, $.get(double)));

	$.delegated('click', button, function click() {
		return $.update(count);
	});

	$.bind_checked(
		input,
		function get() {
			return $.get(checked);
		},
		function set($$value) {
			$.set(checked, $$value);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);