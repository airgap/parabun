TabPanel[$.FILENAME] = 'TabPanel.svelte';

import * as $ from 'svelte/internal/server';
import { getContext, onDestroy } from 'svelte';
import { TABS } from './Tabs.svelte';

function TabPanel($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			var $$store_subs;
			const panel = {};
			const { registerPanel, unregisterPanel, selectedPanel } = getContext(TABS);

			registerPanel(panel);

			onDestroy(() => {
				unregisterPanel(panel);
			});

			if ($.store_get($$store_subs ??= {}, '$selectedPanel', selectedPanel) === panel) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<!--[-->`);
				$.slot($$renderer, $$props, 'default', {}, null);
				$$renderer.push(`<!--]-->`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]-->`);

			if ($$store_subs) $.unsubscribe_stores($$store_subs);
		},
		TabPanel
	);
}

TabPanel.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default TabPanel;