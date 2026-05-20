import 'svelte/internal/flags/async';

Component[$.FILENAME] = 'Component.svelte';

import * as $ from 'svelte/internal/server';

function Component($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<h2 class="svelte-lsmn3l">`);
			$.push_element($$renderer, 'h2', 1, 0);
			$$renderer.push(`hello from component</h2>`);
			$.pop_element();
		},
		Component
	);
}

Component.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Component;