import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let state = void 0;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 7, 0);
			$$renderer.push(`</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (state) {
				$$renderer.push('<!--[0-->');
				Component($$renderer, { state });
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