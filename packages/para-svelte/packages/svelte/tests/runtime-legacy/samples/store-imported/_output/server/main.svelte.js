Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import foo from './foo.js';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			var $$store_subs;
			const answer = $.store_get($$store_subs ??= {}, '$foo', foo);

			$$renderer.push(`<p>`);
			$.push_element($$renderer, 'p', 6, 0);
			$$renderer.push(`${$.escape(answer)}</p>`);
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