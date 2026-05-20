import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/tracing';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.add_locations($.from_html(`<button> </button>`), Main[$.FILENAME], [[12, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const $count = () => (
		$.validate_store(count, 'count'),
		$.store_get(count, '$count', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();
	const count = writable(0);

	$.user_effect(() => {
		return $.trace(() => 'effect', () => {
			$count();
		});
	});

	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicks: ${$count() ?? ''}`));

	$.delegated('click', button, function click() {
		return $.store_set(count, $count() + 1);
	});

	$.append($$anchor, button);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}

$.delegate(['click']);