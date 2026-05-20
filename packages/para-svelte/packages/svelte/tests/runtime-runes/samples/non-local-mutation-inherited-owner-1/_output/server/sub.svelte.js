import 'svelte/internal/flags/async';

Sub[$.FILENAME] = 'sub.svelte';

import * as $ from 'svelte/internal/server';
import { getContext } from 'svelte';

function Sub($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			const list = getContext('list');

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 7, 0);
			$$renderer.push(`[${$.escape(list.join(','))}]</button>`);
			$.pop_element();
		},
		Sub
	);
}

Sub.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Sub;