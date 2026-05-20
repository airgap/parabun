import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let open = false;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 7, 0);
			$$renderer.push(`toggle</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (open) {
				$$renderer.push('<!--[0-->');
				Child($$renderer, {});
				$$renderer.push(`<!---->`);
			} else {
				$$renderer.push('<!--[-1-->');
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