import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Inner from './inner.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Inner($$anchor, {
			children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
				$.next();

				var text = $.text('I don\'t need to use the argument if I don\'t want to');

				$.append($$anchor, text);
			}),
			$$slots: { default: true }
		}),
		'component',
		Main,
		5,
		0,
		{ componentTag: 'Inner' }
	);

	return $.pop($$exports);
}