import 'svelte/internal/flags/async';

Component1[$.FILENAME] = 'Component1.svelte';

import * as $ from 'svelte/internal/server';

function Component1($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { children } = $$props;

			children($$renderer);
			$$renderer.push(`<!---->`);
		},
		Component1
	);
}

Component1.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Component1;