import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Component1 from './Component1.svelte';
import Component2 from './Component2.svelte';
import Component3 from './Component3.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state($.proxy({ value: 0 })), 'count');
	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Component1($$anchor, {
			children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
				$.add_svelte_meta(
					() => Component2($$anchor, {
						children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
							$.add_svelte_meta(
								() => Component3($$anchor, {
									get count() {
										return $.get(count);
									},

									set count($$value) {
										$.set(count, $$value, true);
									}
								}),
								'component',
								Main,
								11,
								2,
								{ componentTag: 'Component3' }
							);
						}),
						$$slots: { default: true }
					}),
					'component',
					Main,
					10,
					1,
					{ componentTag: 'Component2' }
				);
			}),
			$$slots: { default: true }
		}),
		'component',
		Main,
		9,
		0,
		{ componentTag: 'Component1' }
	);

	return $.pop($$exports);
}