import 'svelte/internal/flags/async';

Component[$.FILENAME] = 'Component.svelte';

import * as $ from 'svelte/internal/server';

function Component($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { open: is_open = void 0 } = $$props;

			function open() {
				is_open = !is_open;
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 9, 0);
			$$renderer.push(`${$.escape(is_open)}</button>`);
			$.pop_element();
			$.bind_props($$props, { open: is_open, open });
		},
		Component
	);
}

Component.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Component;