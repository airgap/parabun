import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import List from "./List.svelte";

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let data = { things: [{ id: 1 }, { id: 2 }] };

			function reloadData() {
				data = null;
			}

			if (data) {
				$$renderer.push('<!--[0-->');
				List($$renderer, { things: data.things.map((t) => t) });
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <button>`);
			$.push_element($$renderer, 'button', 15, 0);
			$$renderer.push(`clear</button>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;