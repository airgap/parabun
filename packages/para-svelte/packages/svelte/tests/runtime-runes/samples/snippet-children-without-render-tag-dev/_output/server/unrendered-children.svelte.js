import 'svelte/internal/flags/async';

Unrendered_children[$.FILENAME] = 'unrendered-children.svelte';

import * as $ from 'svelte/internal/server';

function Unrendered_children($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { children } = $$props;

			$$renderer.push(`<!---->${$.escape(children)}`);
		},
		Unrendered_children
	);
}

Unrendered_children.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Unrendered_children;