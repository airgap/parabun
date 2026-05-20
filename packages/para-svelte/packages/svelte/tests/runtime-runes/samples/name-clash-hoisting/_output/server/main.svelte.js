import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			var $$store_subs;
			const store = writable(0);

			async function logStore() {
				console.log($.store_get($$store_subs ??= {}, '$store', store));
				store.set(100);
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 11, 0);
			$$renderer.push(`Click me</button>`);
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