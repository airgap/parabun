import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import UnrenderedChildren from './unrendered-children.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => UnrenderedChildren($$anchor, {
			children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
				$.next();

				var text = $.text('Hi');

				$.append($$anchor, text);
			}),
			$$slots: { default: true }
		}),
		'component',
		Main,
		5,
		0,
		{ componentTag: 'UnrenderedChildren' }
	);

	return $.pop($$exports);
}