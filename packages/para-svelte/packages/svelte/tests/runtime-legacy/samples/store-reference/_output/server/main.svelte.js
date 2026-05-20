Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			var $$store_subs;
			let store = writable(0);

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 6, 0);
			$$renderer.push(`clicks: ${$.escape($.store_get($$store_subs ??= {}, '$store', store))}</button>`);
			$.pop_element();

			if ($$store_subs) $.unsubscribe_stores($$store_subs);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;