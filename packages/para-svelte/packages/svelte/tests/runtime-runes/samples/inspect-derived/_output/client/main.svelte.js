import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Main[$.FILENAME], [[11, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	/** @type {{ push: (v: any) => void }} */
	let x = $.tag($.state('x'), 'x');

	let y = $.tag($.derived(() => $.get(x).toUpperCase()), 'y');

	$.inspect(() => [$.get(y)], (...$$args) => $$props.push(...$$args));

	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $.get(x)));

	$.event('click', button, function click() {
		return $.set(x, $.get(x) + 'x');
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}