import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let a = 0;
	let b = $.tag($.state(0), 'b');

	$.inspect(() => [a], (...$$args) => ((...args) => {
		console.log(...$.log_if_contains_state('log', ...args));
		$.update(b);
	})(...$$args));

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}