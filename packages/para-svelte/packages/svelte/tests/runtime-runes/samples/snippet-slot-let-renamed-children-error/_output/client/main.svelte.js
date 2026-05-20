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
			children: $.invalid_default_snippet,
			$$slots: {
				default: ($$anchor, $$slotProps) => {
					const foo = $.derived(() => $$slotProps.foo);

					$.next();

					var text = $.text();

					$.template_effect(() => $.set_text(text, $.get(foo)));
					$.append($$anchor, text);
				}
			}
		}),
		'component',
		Main,
		5,
		0,
		{ componentTag: 'Inner' }
	);

	return $.pop($$exports);
}