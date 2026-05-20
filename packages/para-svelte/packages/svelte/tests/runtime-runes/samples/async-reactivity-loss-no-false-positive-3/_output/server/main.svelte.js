import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count = 0;

			async function run() {
				await new Promise((r) => setTimeout(r));
			}

			async function get() {
				run();

				return 1;
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 13, 0);
			$$renderer.push(`${$.escape(count)}</button>`);
			$.pop_element();
			$$renderer.push(` `);
			$$renderer.push(async () => $.escape(await get()));
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;