import 'svelte/internal/flags/async';

Component2[$.FILENAME] = 'Component2.svelte';

import * as $ from 'svelte/internal/server';

function Component2($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { children } = $$props;

			children($$renderer);
			$$renderer.push(`<!---->`);
		},
		Component2
	);
}

Component2.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Component2;