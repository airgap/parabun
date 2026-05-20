import 'svelte/internal/flags/async';

Outer[$.FILENAME] = 'Outer.svelte';

import * as $ from 'svelte/internal/server';

function Outer($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { children } = $$props;

			children?.($$renderer);
			$$renderer.push(`<!---->`);
		},
		Outer
	);
}

Outer.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Outer;