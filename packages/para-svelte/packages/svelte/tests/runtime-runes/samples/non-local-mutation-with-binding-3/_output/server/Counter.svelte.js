import 'svelte/internal/flags/async';

Counter[$.FILENAME] = 'Counter.svelte';

import * as $ from 'svelte/internal/server';

function Counter($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			/** @type {{ shared: { count: number }, notshared: { count: number } }} */
			let { shared = void 0, notshared } = $$props;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 6, 0);
			$$renderer.push(`clicks: ${$.escape(shared.count)}</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 10, 0);
			$$renderer.push(`clicks: ${$.escape(notshared.count)}</button>`);
			$.pop_element();
			$.bind_props($$props, { shared });
		},
		Counter
	);
}

Counter.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Counter;