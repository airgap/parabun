import 'svelte/internal/flags/async';

A[$.FILENAME] = 'A.svelte';

import * as $ from 'svelte/internal/server';

function A($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<!---->A`);
		},
		A
	);
}

A.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default A;