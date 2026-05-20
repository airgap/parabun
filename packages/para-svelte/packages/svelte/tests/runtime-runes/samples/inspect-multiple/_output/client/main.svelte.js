import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button> <button> </button>`, 1), Main[$.FILENAME], [[8, 0], [9, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let x = $.tag($.state(0), 'x');
	let y = $.tag($.state(0), 'y');

	$.inspect(() => [$.get(x), $.get(y)], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1, true);

	$.reset(button_1);

	$.template_effect(() => {
		$.set_text(text, $.get(x));
		$.set_text(text_1, $.get(y));
	});

	$.event('click', button, function click() {
		return $.update(x);
	});

	$.event('click', button_1, function click_1() {
		return $.update(y);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}