import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/tracing';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Main[$.FILENAME], [[9, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(null), 'count');

	$.user_effect(() => {
		return $.trace(() => '$effect(...) (main.svelte:3:9)', () => {
			$.get(count);
		});
	});

	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $.get(count)));

	$.delegated('click', button, function click() {
		return $.update(count);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);