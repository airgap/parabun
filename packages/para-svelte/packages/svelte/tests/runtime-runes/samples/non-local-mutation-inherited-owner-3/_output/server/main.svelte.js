import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let items = [
				{ id: "test", name: "this is a test" },
				{ id: "test2", name: "this is a second test" }
			];

			let found = void 0;

			function onclick() {
				found = items.find((c) => c.id === 'test2');
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 12, 0);
			$$renderer.push(`First click here</button>`);
			$.pop_element();
			$$renderer.push(` `);
			Child($$renderer, { item: found });
			$$renderer.push(`<!---->`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;