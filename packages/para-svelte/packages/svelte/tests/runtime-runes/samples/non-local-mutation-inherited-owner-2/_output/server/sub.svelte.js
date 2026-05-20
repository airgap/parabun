import 'svelte/internal/flags/async';

Sub[$.FILENAME] = 'sub.svelte';

import * as $ from 'svelte/internal/server';

function Sub($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { inc, count = void 0 } = $$props;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 5, 0);
			$$renderer.push(`${$.escape(count.a)} (ok)</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 6, 0);
			$$renderer.push(`${$.escape(count.a)} (bad)</button>`);
			$.pop_element();
			$.bind_props($$props, { count });
		},
		Sub
	);
}

Sub.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Sub;