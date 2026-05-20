import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<h1>`);
			$.push_element($$renderer, 'h1', 5, 0);
			$$renderer.push(`hello</h1>`);
			$.pop_element();
			$$renderer.push(` `);

			$.css_props($$renderer, true, { '--color': 'red' }, () => {
				Component($$renderer, {});
			});

			$$renderer.push(` <p>`);
			$.push_element($$renderer, 'p', 7, 0);
			$$renderer.push(`goodbye</p>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;