import 'svelte/internal/flags/async';

Component[$.FILENAME] = 'Component.svelte';

import * as $ from 'svelte/internal/server';

function Component($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<!---->component`);
		},
		Component
	);
}

Component.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Component;