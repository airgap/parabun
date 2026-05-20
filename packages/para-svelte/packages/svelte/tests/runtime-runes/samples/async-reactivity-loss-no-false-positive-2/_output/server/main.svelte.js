import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count = 0;

			async function delay(c) {
				if (c) {
					await new Promise((r) => setTimeout(r));
					count; // count already read synchronously; should not result in reacitive loss warning
				}

				return c;
			}

			$$renderer.push(`<!---->`);
			$$renderer.push(async () => $.escape(await delay(count)));
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 14, 0);
			$$renderer.push(`count++</button>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;