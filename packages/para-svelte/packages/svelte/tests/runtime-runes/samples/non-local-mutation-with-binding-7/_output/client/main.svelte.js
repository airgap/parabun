import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Component1 from './Component1.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let rows = $.tag($.state($.proxy([{}])), 'rows');
	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Component1($$anchor, {
			get rows() {
				return $.get(rows);
			},

			set rows($$value) {
				$.set(rows, $$value, true);
			}
		}),
		'component',
		Main,
		7,
		0,
		{ componentTag: 'Component1' }
	);

	return $.pop($$exports);
}