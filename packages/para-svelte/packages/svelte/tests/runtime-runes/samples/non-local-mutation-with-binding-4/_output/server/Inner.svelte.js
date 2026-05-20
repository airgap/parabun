import 'svelte/internal/flags/async';

Inner[$.FILENAME] = 'Inner.svelte';

import * as $ from 'svelte/internal/server';

function Inner($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { object = void 0 } = $$props;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 5, 0);
			$$renderer.push(`clicks: ${$.escape(object.count)}</button>`);
			$.pop_element();
			$.bind_props($$props, { object });
		},
		Inner
	);
}

Inner.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Inner;