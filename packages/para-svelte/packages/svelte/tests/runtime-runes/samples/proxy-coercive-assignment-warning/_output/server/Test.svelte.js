import 'svelte/internal/flags/async';

Test[$.FILENAME] = 'Test.svelte';

import * as $ from 'svelte/internal/server';

function Test($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { x = void 0 } = $$props;

			function soThatTestReturnsAnObject() {
				return x;
			}

			$.bind_props($$props, { x, soThatTestReturnsAnObject });
		},
		Test
	);
}

Test.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Test;