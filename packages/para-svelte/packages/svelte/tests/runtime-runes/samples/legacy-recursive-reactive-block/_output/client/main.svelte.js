import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { run } from 'svelte/legacy';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(0), 'count');

	run(() => {
		$.set(count, $.get(count) + 1);
	});

	var $$exports = { ...$.legacy_api() };

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, $.get(count)));
	$.append($$anchor, text);

	return $.pop($$exports);
}