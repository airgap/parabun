import 'svelte/internal/flags/async';

Item[$.FILENAME] = 'Item.svelte';

import * as $ from 'svelte/internal/server';
import { getContext } from 'svelte';

function Item($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { children, value } = $$props;
			let listContext = getContext('list');
			let selected = $.derived(() => listContext?.selectedValue === value);

			console.log('$inspect(', value, selected(), ')');
			$$renderer.push(`<div${$.attr_class('', void 0, { 'selected': selected() })}>`);
			$.push_element($$renderer, 'div', 13, 0);
			children($$renderer);
			$$renderer.push(`<!----></div>`);
			$.pop_element();
		},
		Item
	);
}

Item.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Item;