import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { writable } from "svelte/store";
import Child from "./child.svelte";

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			const attrs = writable({ count: 0 });

			Child($$renderer, { attrs });
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;