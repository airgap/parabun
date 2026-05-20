import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Tabs[$.FILENAME] = 'Tabs.svelte';

import * as $ from 'svelte/internal/client';
import { setContext } from 'svelte';
import { writable } from 'svelte/store';

export const TABS = {};

var root = $.add_locations($.from_html(`<div class="tabs"><!></div>`), Tabs[$.FILENAME], [[50, 0]]);

export default function Tabs($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Tabs);

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
			selectedTab.update((current) => $.strict_equals(current, tab) ? tabs[i] || tabs[tabs.length - 1] : current);
		},

		registerPanel: (panel) => {
			panels.push(panel);
			selectedPanel.update((current) => current || panel);
		},

		unregisterPanel: (panel) => {
			const i = panels.indexOf(panel);

			panels.splice(i, 1);
			selectedPanel.update((current) => $.strict_equals(current, panel) ? panels[i] || panels[panels.length - 1] : current);
		},

		selectTab: (tab) => {
			const i = tabs.indexOf(tab);

			selectedTab.set(tab);
			selectedPanel.set(panels[i]);
		},
		selectedTab,
		selectedPanel
	});

	var $$exports = { ...$.legacy_api() };

	$.init();

	var div = root();
	var node = $.child(div);

	$.slot(node, $$props, 'default', {}, null);
	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}