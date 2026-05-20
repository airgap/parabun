import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button></button> <button></button>`, 1), Main[$.FILENAME], [[12, 0], [13, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let a = $.tag($.state(0), 'a');
	let b = $.tag($.state(0), 'b');

	$.inspect(() => [$.get(a)], (...$$args) => ((...args) => {
		console.log(...$.log_if_contains_state('log', ...args));
		$.get(b);
	})(...$$args));

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);

	$.delegated('click', button, function click() {
		return $.update(a);
	});

	$.delegated('click', button_1, function click_1() {
		return $.update(b);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);