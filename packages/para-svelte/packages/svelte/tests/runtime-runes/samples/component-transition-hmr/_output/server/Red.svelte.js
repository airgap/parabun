import 'svelte/internal/flags/async';

Red[$.FILENAME] = 'Red.svelte';

import * as $ from 'svelte/internal/server';

function Red($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			function show(node) {
				return { duration: 500, css: (t) => `opacity: ${t}` };
			}

			$$renderer.push(`<div class="red">`);
			$.push_element($$renderer, 'div', 10, 0);
			$$renderer.push(`</div>`);
			$.pop_element();
		},
		Red
	);
}

Red.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Red;