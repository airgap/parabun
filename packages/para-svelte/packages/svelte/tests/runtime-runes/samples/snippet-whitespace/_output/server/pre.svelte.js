import 'svelte/internal/flags/async';

Pre[$.FILENAME] = 'pre.svelte';

import * as $ from 'svelte/internal/server';

function Pre($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { children } = $$props;

			$$renderer.push(`<pre>`);
			$.push_element($$renderer, 'pre', 5, 0);
			children($$renderer);
			$$renderer.push(`<!----></pre>`);
			$.pop_element();
		},
		Pre
	);
}

Pre.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Pre;