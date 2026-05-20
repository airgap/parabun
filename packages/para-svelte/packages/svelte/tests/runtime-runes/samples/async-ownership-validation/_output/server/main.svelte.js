import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let object = { count: 0 };

			$$renderer.push(`<!--[!-->`);

			{
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 11, 2);
				$$renderer.push(`loading...</p>`);
				$.pop_element();
			}

			$$renderer.push(`<!--]-->`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;