import 'svelte/internal/flags/async';

H1[$.FILENAME] = 'h1.svelte';

import * as $ from 'svelte/internal/server';

function H1($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<h1>`);
			$.push_element($$renderer, 'h1', 1, 0);
			$$renderer.push(`foo</h1>`);
			$.pop_element();
		},
		H1
	);
}

H1.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default H1;