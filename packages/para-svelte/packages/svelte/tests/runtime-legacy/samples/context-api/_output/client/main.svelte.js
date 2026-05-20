import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Tabs from './Tabs.svelte';
import TabList from './TabList.svelte';
import Tab from './Tab.svelte';
import TabPanel from './TabPanel.svelte';

var root_2 = $.add_locations($.from_html(`<!> <!> <!>`, 1), Main[$.FILENAME], []);
var root_7 = $.add_locations($.from_html(`<h2>Small panel</h2>`), Main[$.FILENAME], [[18, 2]]);
var root_9 = $.add_locations($.from_html(`<h2>Medium panel</h2>`), Main[$.FILENAME], [[23, 3]]);
var root_10 = $.add_locations($.from_html(`<h2>Large panel</h2>`), Main[$.FILENAME], [[28, 2]]);
var root_1 = $.add_locations($.from_html(`<!> <!> <!> <!>`, 1), Main[$.FILENAME], []);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	let show_medium = $.prop($$props, 'show_medium', 12, false);

	var $$exports = {
		...$.legacy_api(),
		get show_medium() {
			return show_medium();
		},

		set show_medium($$value) {
			show_medium($$value);
			$.flush();
		}
	};

	$.add_svelte_meta(
		() => Tabs($$anchor, {
			children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
				var fragment_1 = root_1();
				var node = $.first_child(fragment_1);

				$.add_svelte_meta(
					() => TabList(node, {
						children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
							var fragment_2 = root_2();
							var node_1 = $.first_child(fragment_2);

							$.add_svelte_meta(
								() => Tab(node_1, {
									children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
										$.next();

										var text = $.text('small');

										$.append($$anchor, text);
									}),
									$$slots: { default: true }
								}),
								'component',
								Main,
								12,
								2,
								{ componentTag: 'Tab' }
							);

							var node_2 = $.sibling(node_1, 2);

							{
								var consequent = ($$anchor) => {
									$.add_svelte_meta(
										() => Tab($$anchor, {
											children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
												$.next();

												var text_1 = $.text('medium');

												$.append($$anchor, text_1);
											}),
											$$slots: { default: true }
										}),
										'component',
										Main,
										13,
										19,
										{ componentTag: 'Tab' }
									);
								};

								$.add_svelte_meta(
									() => $.if(node_2, ($$render) => {
										if (show_medium()) $$render(consequent);
									}),
									'if',
									Main,
									13,
									2
								);
							}

							var node_3 = $.sibling(node_2, 2);

							$.add_svelte_meta(
								() => Tab(node_3, {
									children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
										$.next();

										var text_2 = $.text('large');

										$.append($$anchor, text_2);
									}),
									$$slots: { default: true }
								}),
								'component',
								Main,
								14,
								2,
								{ componentTag: 'Tab' }
							);

							$.append($$anchor, fragment_2);
						}),
						$$slots: { default: true }
					}),
					'component',
					Main,
					11,
					1,
					{ componentTag: 'TabList' }
				);

				var node_4 = $.sibling(node, 2);

				$.add_svelte_meta(
					() => TabPanel(node_4, {
						children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
							var h2 = root_7();

							$.append($$anchor, h2);
						}),
						$$slots: { default: true }
					}),
					'component',
					Main,
					17,
					1,
					{ componentTag: 'TabPanel' }
				);

				var node_5 = $.sibling(node_4, 2);

				{
					var consequent_1 = ($$anchor) => {
						$.add_svelte_meta(
							() => TabPanel($$anchor, {
								children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
									var h2_1 = root_9();

									$.append($$anchor, h2_1);
								}),
								$$slots: { default: true }
							}),
							'component',
							Main,
							22,
							2,
							{ componentTag: 'TabPanel' }
						);
					};

					$.add_svelte_meta(
						() => $.if(node_5, ($$render) => {
							if (show_medium()) $$render(consequent_1);
						}),
						'if',
						Main,
						21,
						1
					);
				}

				var node_6 = $.sibling(node_5, 2);

				$.add_svelte_meta(
					() => TabPanel(node_6, {
						children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
							var h2_2 = root_10();

							$.append($$anchor, h2_2);
						}),
						$$slots: { default: true }
					}),
					'component',
					Main,
					27,
					1,
					{ componentTag: 'TabPanel' }
				);

				$.append($$anchor, fragment_1);
			}),
			$$slots: { default: true }
		}),
		'component',
		Main,
		10,
		0,
		{ componentTag: 'Tabs' }
	);

	return $.pop($$exports);
}