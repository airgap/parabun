import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.child_block(async ($$renderer) => {
				if ((await $.save(true))()) {
					$$renderer.push('<!--[0-->');
					$$renderer.push(`<h1>`);
					$.push_element($$renderer, 'h1', 2, 1);
					$$renderer.push(`hello!</h1>`);
					$.pop_element();
				} else {
					$$renderer.push('<!--[-1-->');
				}
			});

			$$renderer.push(`<!--]-->`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;