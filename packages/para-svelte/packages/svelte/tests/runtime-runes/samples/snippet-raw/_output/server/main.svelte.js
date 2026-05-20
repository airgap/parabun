import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { createRawSnippet } from 'svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count = 0;

			const hello = createRawSnippet((count) => ({
				render: () => `
			<p>clicks: ${count()}</p>
		`,
				setup(p) {}
			}));

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 18, 0);
			$$renderer.push(`click</button>`);
			$.pop_element();
			$$renderer.push(` `);
			hello($$renderer, count);
			$$renderer.push(`<!---->`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;