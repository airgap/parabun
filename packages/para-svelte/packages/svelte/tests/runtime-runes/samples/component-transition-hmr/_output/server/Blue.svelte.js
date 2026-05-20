import 'svelte/internal/flags/async';

Blue[$.FILENAME] = 'Blue.svelte';

import * as $ from 'svelte/internal/server';

function Blue($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<div>`);
			$.push_element($$renderer, 'div', 1, 0);
			$$renderer.push(`</div>`);
			$.pop_element();
		},
		Blue
	);
}

Blue.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Blue;