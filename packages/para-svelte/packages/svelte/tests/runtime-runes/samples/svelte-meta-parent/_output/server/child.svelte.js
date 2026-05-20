import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'child.svelte';

import * as $ from 'svelte/internal/server';

function Child($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<p>`);
			$.push_element($$renderer, 'p', 1, 0);
			$$renderer.push(`hi</p>`);
			$.pop_element();
		},
		Child
	);
}

Child.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Child;