import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let items = [{}];
	let data = $.tag($.state(void 0), 'data');

	$.user_effect(() => {
		$.set(data, items.slice(0, 1), true);
	});

	$.inspect(() => [$.get(data)], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}