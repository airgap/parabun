import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Main[$.FILENAME], [[9, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(0), 'count');

	function increment() {
		$.set(count, $.get(count) + 1);
	}

	var $$exports = { ...$.legacy_api() };
	var button = root();
	var event_handler = $.derived(increment);
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicks: ${$.get(count) ?? ''}`));

	$.delegated('click', button, function (...$$args) {
		$.apply(() => $.get(event_handler), this, $$args, Main, [9, 17], true, true);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);