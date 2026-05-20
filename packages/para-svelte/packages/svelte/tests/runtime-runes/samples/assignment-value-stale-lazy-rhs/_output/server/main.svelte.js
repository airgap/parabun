import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count1 = 0;
			let count2 = 0;
			let cache = {};

			function go() {
				count1++;

				const value = cache.value ??= get_value();
			}

			function get_value() {
				count2++;

				return 42;
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 17, 0);
			$$renderer.push(`go</button>`);
			$.pop_element();
			$$renderer.push(` <p>`);
			$.push_element($$renderer, 'p', 18, 0);
			$$renderer.push(`count1: ${$.escape(count1)}, count2: ${$.escape(count2)}</p>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;