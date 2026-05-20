import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let a = $.tag($.state(0), 'a');

	let b = $.tag(
		$.derived(() => {
			$.user_effect(() => {
				$.set(a, 1);
			});

			return $.get(a);
		}),
		'b'
	);

	$.inspect(() => [$.get(b)], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}