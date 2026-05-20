import 'svelte/internal/flags/async';

Inner[$.FILENAME] = 'inner.svelte';

import * as $ from 'svelte/internal/server';

function Inner($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { children } = $$props;

			children($$renderer, true);
			$$renderer.push(`<!---->`);
		},
		Inner
	);
}

Inner.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Inner;