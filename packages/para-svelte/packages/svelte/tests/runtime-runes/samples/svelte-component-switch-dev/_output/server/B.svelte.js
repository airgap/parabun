import 'svelte/internal/flags/async';

B[$.FILENAME] = 'B.svelte';

import * as $ from 'svelte/internal/server';

function B($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<!---->B`);
		},
		B
	);
}

B.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default B;