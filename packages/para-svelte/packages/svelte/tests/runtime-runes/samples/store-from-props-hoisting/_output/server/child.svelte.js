import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'child.svelte';

import * as $ from 'svelte/internal/server';

function Child($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			var $$store_subs;
			const { attrs } = $$props;

			function increment() {
				$.store_get($$store_subs ??= {}, '$attrs', attrs).count++;
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 8, 0);
			$$renderer.push(`${$.escape($.store_get($$store_subs ??= {}, '$attrs', attrs).count)}</button>`);
			$.pop_element();

			if ($$store_subs) $.unsubscribe_stores($$store_subs);
		},
		Child
	);
}

Child.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Child;