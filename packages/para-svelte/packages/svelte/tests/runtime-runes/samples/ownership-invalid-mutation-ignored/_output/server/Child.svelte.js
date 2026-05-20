import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/server';

function Child($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			var $$store_subs;
			let { test, store } = $$props;
			let der = $.derived(() => test);
			let state = test;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 7, 0);
			$$renderer.push(`</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 17, 0);
			$$renderer.push(`</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 27, 0);
			$$renderer.push(`</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 37, 0);
			$$renderer.push(`</button>`);
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