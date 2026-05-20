Tabs[$.FILENAME] = 'Tabs.svelte';

import * as $ from 'svelte/internal/server';
import { setContext } from 'svelte';
import { writable } from 'svelte/store';

export const TABS = {};

function Tabs($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			const tabs = [];
			const panels = [];
			const selectedTab = writable(null);
			const selectedPanel = writable(null);

			setContext(TABS, {
				registerTab: (tab) => {
					tabs.push(tab);
					selectedTab.update((current) => current || tab);
				},

				unregisterTab: (tab) => {
					const i = tabs.indexOf(tab);

					tabs.splice(i, 1);
					selectedTab.update((current) => current === tab ? tabs[i] || tabs[tabs.length - 1] : current);
				},

				registerPanel: (panel) => {
					panels.push(panel);
					selectedPanel.update((current) => current || panel);
				},

				unregisterPanel: (panel) => {
					const i = panels.indexOf(panel);

					panels.splice(i, 1);
					selectedPanel.update((current) => current === panel ? panels[i] || panels[panels.length - 1] : current);
				},

				selectTab: (tab) => {
					const i = tabs.indexOf(tab);

					selectedTab.set(tab);
					selectedPanel.set(panels[i]);
				},
				selectedTab,
				selectedPanel
			});

			$$renderer.push(`<div class="tabs">`);
			$.push_element($$renderer, 'div', 50, 0);
			$$renderer.push(`<!--[-->`);
			$.slot($$renderer, $$props, 'default', {}, null);
			$$renderer.push(`<!--]--></div>`);
			$.pop_element();
		},
		Tabs
	);
}

Tabs.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Tabs;