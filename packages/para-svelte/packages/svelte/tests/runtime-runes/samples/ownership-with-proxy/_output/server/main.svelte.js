import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { setContext, getContext } from "svelte";

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			setContext("", new Proxy({}, {
				get() {
					return {};
				}
			}));

			getContext("");
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;