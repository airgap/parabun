import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

TabPanel[$.FILENAME] = 'TabPanel.svelte';

import * as $ from 'svelte/internal/client';
import { getContext, onDestroy } from 'svelte';
import { TABS } from './Tabs.svelte';

export default function TabPanel($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, TabPanel);

	const $selectedPanel = () => (
		$.validate_store(selectedPanel, 'selectedPanel'),
		$.store_get(selectedPanel, '$selectedPanel', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();
	const panel = {};
	const { registerPanel, unregisterPanel, selectedPanel } = getContext(TABS);

	registerPanel(panel);

	onDestroy(() => {
		unregisterPanel(panel);
	});

	var $$exports = { ...$.legacy_api() };

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.slot(node_1, $$props, 'default', {}, null);
			$.append($$anchor, fragment_1);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if ($.strict_equals($selectedPanel(), panel)) $$render(consequent);
			}),
			'if',
			TabPanel,
			14,
			0
		);
	}

	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}