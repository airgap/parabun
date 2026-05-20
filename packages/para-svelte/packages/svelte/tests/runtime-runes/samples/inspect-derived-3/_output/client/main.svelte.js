import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import List from './List.svelte';
import Item from './Item.svelte';

var root_1 = $.add_locations($.from_html(`<!> <!> <!>`, 1), Main[$.FILENAME], []);
var root = $.add_locations($.from_html(`<!> <button>Change Selection</button>`, 1), Main[$.FILENAME], [[18, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let selectedIndex = $.tag($.state(0), 'selectedIndex');
	let selectedValue = $.tag($.derived(() => `${$.get(selectedIndex)}`), 'selectedValue');

	const changeSelection = () => {
		$.set(selectedIndex, ($.get(selectedIndex) + 1) % 3);
	};

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => List(node, {
			get selectedValue() {
				return $.get(selectedValue);
			},

			children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
				var fragment_1 = root_1();
				var node_1 = $.first_child(fragment_1);

				$.add_svelte_meta(
					() => Item(node_1, {
						value: '0',
						children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
							$.next();

							var text = $.text('First');

							$.append($$anchor, text);
						}),
						$$slots: { default: true }
					}),
					'component',
					Main,
					14,
					1,
					{ componentTag: 'Item' }
				);

				var node_2 = $.sibling(node_1, 2);

				$.add_svelte_meta(
					() => Item(node_2, {
						value: '1',
						children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
							$.next();

							var text_1 = $.text('Second');

							$.append($$anchor, text_1);
						}),
						$$slots: { default: true }
					}),
					'component',
					Main,
					15,
					1,
					{ componentTag: 'Item' }
				);

				var node_3 = $.sibling(node_2, 2);

				$.add_svelte_meta(
					() => Item(node_3, {
						value: '2',
						children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
							$.next();

							var text_2 = $.text('Third');

							$.append($$anchor, text_2);
						}),
						$$slots: { default: true }
					}),
					'component',
					Main,
					16,
					1,
					{ componentTag: 'Item' }
				);

				$.append($$anchor, fragment_1);
			}),
			$$slots: { default: true }
		}),
		'component',
		Main,
		13,
		0,
		{ componentTag: 'List' }
	);

	var button = $.sibling(node, 2);

	$.delegated('click', button, changeSelection);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);