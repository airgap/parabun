import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			const filesState = { files: {} };
			let nodes = { id: 1, items: [{ id: 2, items: [{ id: 3 }, { id: 4 }] }] };

			filesState.files = nodes;

			function test() {
				filesState.files.items[0].parent = filesState.files;
			}
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;