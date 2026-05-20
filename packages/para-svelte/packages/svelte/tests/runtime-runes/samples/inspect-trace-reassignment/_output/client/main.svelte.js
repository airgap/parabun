import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/tracing';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<input type="checkbox"/> <button> </button>`, 1), Main[$.FILENAME], [[15, 0], [16, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(0), 'count');
	let checked = $.tag($.state(false), 'checked');

	$.user_effect(() => {
		return $.trace(() => "effect", () => {
			if ($.get(checked) && $.get(count) > 0 && $.get(count) < 3) {
				let old = $.get(count);

				// this should not show up in the logs
				$.set(count, 1000);

				$.set(count, old + 1);
			}
		});
	});

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var button = $.sibling(input, 2);
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $.get(count)));

	$.bind_checked(
		input,
		function get() {
			return $.get(checked);
		},
		function set($$value) {
			$.set(checked, $$value);
		}
	);

	$.delegated('click', button, function click() {
		$.update(count);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);