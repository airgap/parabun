import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Tab[$.FILENAME] = 'Tab.svelte';

import * as $ from 'svelte/internal/client';
import { getContext, onDestroy } from 'svelte';
import { TABS } from './Tabs.svelte';

var root = $.add_locations($.from_html(`<button><!></button>`), Tab[$.FILENAME], [[15, 0]]);

export default function Tab($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Tab);

	const $selectedTab = () => (
		$.validate_store(selectedTab, 'selectedTab'),
		$.store_get(selectedTab, '$selectedTab', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();
	const tab = {};
	const { registerTab, unregisterTab, selectTab, selectedTab } = getContext(TABS);

	registerTab(tab);

	onDestroy(() => {
		unregisterTab(tab);
	});

	var $$exports = { ...$.legacy_api() };

	$.init();

	var button = root();
	let classes;
	var node = $.child(button);

	$.slot(node, $$props, 'default', {}, null);
	$.reset(button);
	$.template_effect(() => classes = $.set_class(button, 1, '', null, classes, { selected: $.strict_equals($selectedTab(), tab) }));

	$.event('click', button, function click() {
		return selectTab(tab);
	});

	$.append($$anchor, button);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}