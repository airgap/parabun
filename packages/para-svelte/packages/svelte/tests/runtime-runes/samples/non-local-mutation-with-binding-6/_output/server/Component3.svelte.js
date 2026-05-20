import 'svelte/internal/flags/async';

Component3[$.FILENAME] = 'Component3.svelte';

import * as $ from 'svelte/internal/server';

function Component3($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { count = void 0 } = $$props;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 5, 0);
			$$renderer.push(`${$.escape(count.value)}</button>`);
			$.pop_element();
			$.bind_props($$props, { count });
		},
		Component3
	);
}

Component3.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Component3;