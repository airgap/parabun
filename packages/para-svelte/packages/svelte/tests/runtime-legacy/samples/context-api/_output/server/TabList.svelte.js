TabList[$.FILENAME] = 'TabList.svelte';

import * as $ from 'svelte/internal/server';

function TabList($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<div class="tab-list">`);
			$.push_element($$renderer, 'div', 1, 0);
			$$renderer.push(`<!--[-->`);
			$.slot($$renderer, $$props, 'default', {}, null);
			$$renderer.push(`<!--]--></div>`);
			$.pop_element();
		},
		TabList
	);
}

TabList.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default TabList;