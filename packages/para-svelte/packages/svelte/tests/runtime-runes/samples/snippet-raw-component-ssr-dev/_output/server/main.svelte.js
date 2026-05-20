import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { createRawSnippet, hydrate } from 'svelte';
import { render } from 'svelte/server';
import Child from './Child.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { browser } = $$props;
			let count = 0;

			const hello = createRawSnippet((count) => ({
				render: () => `
			<div>${browser ? '' : render(Child).body}</div>
		`,

				setup(target) {
					hydrate(Child, { target });
				}
			}));

			$$renderer.push(`<div>`);
			$.push_element($$renderer, 'div', 20, 0);
			hello($$renderer);
			$$renderer.push(`<!----></div>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;