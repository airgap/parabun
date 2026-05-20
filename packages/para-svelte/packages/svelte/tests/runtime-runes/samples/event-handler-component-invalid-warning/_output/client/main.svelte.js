import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Button from './Button.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(0), 'count');
	var $$exports = { ...$.legacy_api() };

	{
		let $0 = $.derived(() => $.update(count));

		$.add_svelte_meta(
			() => Button($$anchor, {
				get onclick() {
					return $.get($0);
				},

				children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
					$.next();

					var text = $.text();

					$.template_effect(() => $.set_text(text, `clicks: ${$.get(count) ?? ''}`));
					$.append($$anchor, text);
				}),
				$$slots: { default: true }
			}),
			'component',
			Main,
			7,
			0,
			{ componentTag: 'Button' }
		);
	}

	return $.pop($$exports);
}