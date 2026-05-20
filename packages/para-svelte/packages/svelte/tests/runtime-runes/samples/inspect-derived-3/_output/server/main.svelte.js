import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import List from './List.svelte';
import Item from './Item.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let selectedIndex = 0;
			let selectedValue = $.derived(() => `${selectedIndex}`);

			const changeSelection = () => {
				selectedIndex = (selectedIndex + 1) % 3;
			};

			List($$renderer, {
				selectedValue: selectedValue(),
				children: $.prevent_snippet_stringification(($$renderer) => {
					Item($$renderer, {
						value: '0',
						children: $.prevent_snippet_stringification(($$renderer) => {
							$$renderer.push(`<!---->First`);
						}),
						$$slots: { default: true }
					});

					$$renderer.push(`<!----> `);

					Item($$renderer, {
						value: '1',
						children: $.prevent_snippet_stringification(($$renderer) => {
							$$renderer.push(`<!---->Second`);
						}),
						$$slots: { default: true }
					});

					$$renderer.push(`<!----> `);

					Item($$renderer, {
						value: '2',
						children: $.prevent_snippet_stringification(($$renderer) => {
							$$renderer.push(`<!---->Third`);
						}),
						$$slots: { default: true }
					});

					$$renderer.push(`<!---->`);
				}),
				$$slots: { default: true }
			});

			$$renderer.push(`<!----> <button>`);
			$.push_element($$renderer, 'button', 18, 0);
			$$renderer.push(`Change Selection</button>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;