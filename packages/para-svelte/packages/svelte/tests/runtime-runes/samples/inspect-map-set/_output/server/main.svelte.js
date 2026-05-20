import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let map = new SvelteMap();
			let set = new SvelteSet();

			console.log('$inspect(', map, ')');
			console.log('$inspect(', set, ')');
			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 11, 0);
			$$renderer.push(`Map</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 12, 0);
			$$renderer.push(`Set</button>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;