import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Component1[$.FILENAME] = 'Component1.svelte';

import * as $ from 'svelte/internal/client';
import Component2 from './Component2.svelte';

export default function Component1($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Component1);

	let rows = $.prop($$props, 'rows', 27, () => $.tag_proxy($.proxy([]), 'rows'));
	let rows2 = $.tag($.state($.proxy([])), 'rows2');

	$.user_effect(() => {
		$.set(rows2, rows().slice(), true);
	});

	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Component2($$anchor, {
			get rows() {
				return $.get(rows2);
			},

			set rows($$value) {
				$.set(rows2, $$value, true);
			}
		}),
		'component',
		Component1,
		13,
		0,
		{ componentTag: 'Component2' }
	);

	return $.pop($$exports);
}