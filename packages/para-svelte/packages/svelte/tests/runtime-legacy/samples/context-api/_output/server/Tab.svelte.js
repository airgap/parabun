Tab[$.FILENAME] = 'Tab.svelte';

import * as $ from 'svelte/internal/server';
import { getContext, onDestroy } from 'svelte';
import { TABS } from './Tabs.svelte';

function Tab($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			var $$store_subs;
			const tab = {};
			const { registerTab, unregisterTab, selectTab, selectedTab } = getContext(TABS);

			registerTab(tab);

			onDestroy(() => {
				unregisterTab(tab);
			});

			$$renderer.push(`<button${$.attr_class('', void 0, {
				'selected': $.store_get($$store_subs ??= {}, '$selectedTab', selectedTab) === tab
			})}>`);

			$.push_element($$renderer, 'button', 15, 0);
			$$renderer.push(`<!--[-->`);
			$.slot($$renderer, $$props, 'default', {}, null);
			$$renderer.push(`<!--]--></button>`);
			$.pop_element();

			if ($$store_subs) $.unsubscribe_stores($$store_subs);
		},
		Tab
	);
}

Tab.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Tab;