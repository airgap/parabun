Widget[$.FILENAME] = 'Widget.svelte';

import * as $ from 'svelte/internal/server';

function Widget($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let value = $$props['value'];

			$$renderer.push(`<div>`);
			$.push_element($$renderer, 'div', 5, 0);
			$$renderer.push(`${$.escape(value)}</div>`);
			$.pop_element();
			$.bind_props($$props, { value });
		},
		Widget
	);
}

Widget.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Widget;