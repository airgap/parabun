import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let arr = { test: () => {} };

			// svelte-ignore state_snapshot_uncloneable
			$.snapshot(arr, true);

			$$renderer.push(`<div${$.attributes({ ...$.snapshot(arr, true) })}>`);
			$.push_element($$renderer, 'div', 11, 0);
			$$renderer.push(`a</div>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;