import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/server';

function Child($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { item } = $$props;

			function onclick() {
				item.name = `${item.name} edited`;
			}

			$$renderer.push(`<div>`);
			$.push_element($$renderer, 'div', 9, 0);
			$$renderer.push(`${$.escape(item?.name)}</div>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 10, 0);
			$$renderer.push(`Then click here</button>`);
			$.pop_element();
		},
		Child
	);
}

Child.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Child;