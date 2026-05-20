import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/server';

function Child($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { value = void 0 } = $$props;

			$$renderer.push(`<p>`);
			$.push_element($$renderer, 'p', 5, 0);
			$$renderer.push(`${$.escape(value)}</p>`);
			$.pop_element();
			$.bind_props($$props, { value });
		},
		Child
	);
}

Child.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Child;