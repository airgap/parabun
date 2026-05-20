import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/tracing';
import 'svelte/internal/flags/async';

Entry[$.FILENAME] = 'Entry.svelte';

import * as $ from 'svelte/internal/client';

export default function Entry($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Entry);

	$.user_effect(() => {
		return $.trace(() => 'effect', () => {
			$$props.entry;
		});
	});

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}