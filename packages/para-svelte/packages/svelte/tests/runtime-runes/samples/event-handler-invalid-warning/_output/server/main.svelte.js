import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count = 0;

			function increment() {
				count += 1;
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 9, 0);
			$$renderer.push(`clicks: ${$.escape(count)}</button>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;