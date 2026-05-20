import 'svelte/internal/flags/async';

Parent[$.FILENAME] = 'Parent.svelte';

import * as $ from 'svelte/internal/server';

function Parent($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { test = {} } = $$props;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 5, 0);
			$$renderer.push(`</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 6, 0);
			$$renderer.push(`</button>`);
			$.pop_element();
			$$renderer.push(` ${$.escape(test)}`);
			$.bind_props($$props, { test });
		},
		Parent
	);
}

Parent.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Parent;