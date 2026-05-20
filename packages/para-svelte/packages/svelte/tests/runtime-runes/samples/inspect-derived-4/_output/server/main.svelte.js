import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { SvelteSet } from "svelte/reactivity";

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			const ids = [0, 1, 2];
			const seenIds = new SvelteSet();
			const unseenIds = $.derived(() => ids.filter((id) => !seenIds.has(id)));
			const currentId = $.derived(() => unseenIds().at(0));

			console.log('$inspect(', unseenIds(), ')');
			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 12, 0);
			$$renderer.push(`first unseen: ${$.escape(currentId())}</button>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;