Test[$.FILENAME] = 'Test.svelte';

import * as $ from 'svelte/internal/server';

function Test($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let div = $$props['div'];

			$.bind_props($$props, { div });
		},
		Test
	);
}

Test.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Test;