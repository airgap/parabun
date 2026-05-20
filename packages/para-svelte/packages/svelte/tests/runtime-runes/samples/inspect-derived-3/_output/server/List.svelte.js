import 'svelte/internal/flags/async';

List[$.FILENAME] = 'List.svelte';

import * as $ from 'svelte/internal/server';
import { setContext } from 'svelte';

function List($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { children, selectedValue } = $$props;
			let listContext = { selectedValue };

			setContext('list', listContext);
			$$renderer.push(`<div class="list">`);
			$.push_element($$renderer, 'div', 15, 0);
			children($$renderer);
			$$renderer.push(`<!----></div>`);
			$.pop_element();
		},
		List
	);
}

List.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default List;