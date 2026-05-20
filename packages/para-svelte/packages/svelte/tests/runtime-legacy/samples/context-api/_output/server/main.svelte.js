Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Tabs from './Tabs.svelte';
import TabList from './TabList.svelte';
import Tab from './Tab.svelte';
import TabPanel from './TabPanel.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let show_medium = $.fallback($$props['show_medium'], false);

			Tabs($$renderer, {
				children: $.prevent_snippet_stringification(($$renderer) => {
					TabList($$renderer, {
						children: $.prevent_snippet_stringification(($$renderer) => {
							Tab($$renderer, {
								children: $.prevent_snippet_stringification(($$renderer) => {
									$$renderer.push(`<!---->small`);
								}),
								$$slots: { default: true }
							});

							$$renderer.push(`<!----> `);

							if (show_medium) {
								$$renderer.push('<!--[0-->');

								Tab($$renderer, {
									children: $.prevent_snippet_stringification(($$renderer) => {
										$$renderer.push(`<!---->medium`);
									}),
									$$slots: { default: true }
								});
							} else {
								$$renderer.push('<!--[-1-->');
							}

							$$renderer.push(`<!--]--> `);

							Tab($$renderer, {
								children: $.prevent_snippet_stringification(($$renderer) => {
									$$renderer.push(`<!---->large`);
								}),
								$$slots: { default: true }
							});

							$$renderer.push(`<!---->`);
						}),
						$$slots: { default: true }
					});

					$$renderer.push(`<!----> `);

					TabPanel($$renderer, {
						children: $.prevent_snippet_stringification(($$renderer) => {
							$$renderer.push(`<h2>`);
							$.push_element($$renderer, 'h2', 18, 2);
							$$renderer.push(`Small panel</h2>`);
							$.pop_element();
						}),
						$$slots: { default: true }
					});

					$$renderer.push(`<!----> `);

					if (show_medium) {
						$$renderer.push('<!--[0-->');

						TabPanel($$renderer, {
							children: $.prevent_snippet_stringification(($$renderer) => {
								$$renderer.push(`<h2>`);
								$.push_element($$renderer, 'h2', 23, 3);
								$$renderer.push(`Medium panel</h2>`);
								$.pop_element();
							}),
							$$slots: { default: true }
						});
					} else {
						$$renderer.push('<!--[-1-->');
					}

					$$renderer.push(`<!--]--> `);

					TabPanel($$renderer, {
						children: $.prevent_snippet_stringification(($$renderer) => {
							$$renderer.push(`<h2>`);
							$.push_element($$renderer, 'h2', 28, 2);
							$$renderer.push(`Large panel</h2>`);
							$.pop_element();
						}),
						$$slots: { default: true }
					});

					$$renderer.push(`<!---->`);
				}),
				$$slots: { default: true }
			});

			$.bind_props($$props, { show_medium });
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;