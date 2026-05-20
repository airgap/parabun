import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Outer from './Outer.svelte';
import Inner from './Inner.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let object = $.tag($.state($.proxy({ count: 0 })), 'object');
	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Outer($$anchor, {
			children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
				$.add_svelte_meta(
					() => Inner($$anchor, {
						get object() {
							return $.get(object);
						},

						set object($$value) {
							$.set(object, $$value, true);
						}
					}),
					'component',
					Main,
					9,
					1,
					{ componentTag: 'Inner' }
				);
			}),
			$$slots: { default: true }
		}),
		'component',
		Main,
		8,
		0,
		{ componentTag: 'Outer' }
	);

	return $.pop($$exports);
}