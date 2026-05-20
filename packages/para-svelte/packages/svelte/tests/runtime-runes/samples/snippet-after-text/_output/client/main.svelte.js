import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Child($$anchor, {
			children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
				$.next();

				var text = $.text('123');

				$.append($$anchor, text);
			}),
			$$slots: { default: true }
		}),
		'component',
		Main,
		5,
		0,
		{ componentTag: 'Child' }
	);

	return $.pop($$exports);
}