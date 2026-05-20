import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Child from "./child.svelte";
import Passthrough from "./passthrough.svelte";

var root_1 = $.add_locations($.from_html(`<p>if</p>`), Main[$.FILENAME], [[13, 1]]);
var root_2 = $.add_locations($.from_html(`<p>each</p>`), Main[$.FILENAME], [[17, 1]]);
var root_3 = $.add_locations($.from_html(`<p>await</p>`), Main[$.FILENAME], [[23, 1]]);
var root_4 = $.add_locations($.from_html(`<p>loading</p>`), Main[$.FILENAME], [[21, 1]]);
var root_5 = $.add_locations($.from_html(`<p>key</p>`), Main[$.FILENAME], [[27, 1]]);
var root_10 = $.add_locations($.from_html(`<p>hi</p>`), Main[$.FILENAME], [[45, 3]]);
var root = $.add_locations($.from_html(`<p>no parent</p> <button>toggle</button> <!> <!> <!> <!> <!> <!> <!> <!> <!>`, 1), Main[$.FILENAME], [[9, 0], [10, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let x = { y: Child };
	let key = 'test';
	let show = $.tag($.state(true), 'show');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.sibling($.first_child(fragment), 2);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if (true) $$render(consequent);
			}),
			'if',
			Main,
			12,
			0
		);
	}

	var node_1 = $.sibling(node, 2);

	$.add_svelte_meta(
		() => $.each(node_1, 16, () => [1], $.index, ($$anchor, $$item) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		}),
		'each',
		Main,
		16,
		0
	);

	var node_2 = $.sibling(node_1, 2);

	$.add_svelte_meta(
		() => $.await(
			node_2,
			() => Promise.resolve(),
			($$anchor) => {
				var p_3 = root_4();

				$.append($$anchor, p_3);
			},
			($$anchor) => {
				var p_2 = root_3();

				$.append($$anchor, p_2);
			}
		),
		'await',
		Main,
		20,
		0
	);

	var node_3 = $.sibling(node_2, 2);

	$.add_svelte_meta(
		() => $.key(node_3, () => key, ($$anchor) => {
			var p_4 = root_5();

			$.append($$anchor, p_4);
		}),
		'key',
		Main,
		26,
		0
	);

	var node_4 = $.sibling(node_3, 2);

	$.add_svelte_meta(() => Child(node_4, {}), 'component', Main, 30, 0, { componentTag: 'Child' });

	var node_5 = $.sibling(node_4, 2);

	$.add_svelte_meta(
		() => Passthrough(node_5, {
			children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
				$.add_svelte_meta(() => Child($$anchor, {}), 'component', Main, 33, 1, { componentTag: 'Child' });
			}),
			$$slots: { default: true }
		}),
		'component',
		Main,
		32,
		0,
		{ componentTag: 'Passthrough' }
	);

	var node_6 = $.sibling(node_5, 2);

	$.add_svelte_meta(
		() => Passthrough(node_6, {
			children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
				$.add_svelte_meta(
					() => Passthrough($$anchor, {
						children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
							$.add_svelte_meta(() => Child($$anchor, {}), 'component', Main, 38, 2, { componentTag: 'Child' });
						}),
						$$slots: { default: true }
					}),
					'component',
					Main,
					37,
					1,
					{ componentTag: 'Passthrough' }
				);
			}),
			$$slots: { default: true }
		}),
		'component',
		Main,
		36,
		0,
		{ componentTag: 'Passthrough' }
	);

	var node_7 = $.sibling(node_6, 2);

	{
		var consequent_1 = ($$anchor) => {
			{
				const named = $.wrap_snippet(Main, function ($$anchor) {
					$.validate_snippet_args(...arguments);

					var p_5 = root_10();

					$.append($$anchor, p_5);
				});

				$.add_svelte_meta(() => Passthrough($$anchor, { named, $$slots: { named: true } }), 'component', Main, 43, 1, { componentTag: 'Passthrough' });
			}
		};

		$.add_svelte_meta(
			() => $.if(node_7, ($$render) => {
				if ($.get(show)) $$render(consequent_1);
			}),
			'if',
			Main,
			42,
			0
		);
	}

	var node_8 = $.sibling(node_7, 2);

	$.add_svelte_meta(
		() => $.component(node_8, () => x.y, ($$anchor, x_y) => {
			x_y($$anchor, {});
		}),
		'component',
		Main,
		50,
		0,
		{ componentTag: 'x.y' }
	);

	$.delegated('click', button, function click() {
		return $.set(show, !$.get(show));
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);