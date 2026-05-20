import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Child from './child.svelte';
import { global } from './state.svelte.js';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			global.value.count = 0;

			let $$settled = true;
			let $$inner_renderer;

			function $$render_inner($$renderer) {
				Child($$renderer, {
					get a() {
						return global.value;
					},

					set a($$value) {
						global.value = $$value;
						$$settled = false;
					}
				});

				$$renderer.push(`<!----> <button>`);
				$.push_element($$renderer, 'button', 10, 0);
				$$renderer.push(`clicks: ${$.escape(global.value.count)}</button>`);
				$.pop_element();
			}

			do {
				$$settled = true;
				$$inner_renderer = $$renderer.copy();
				$$render_inner($$inner_renderer);
			} while (!$$settled);

			$$renderer.subsume($$inner_renderer);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;