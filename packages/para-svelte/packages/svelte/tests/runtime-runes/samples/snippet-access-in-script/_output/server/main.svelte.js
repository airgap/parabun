import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { fn } from "./fn.js";

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let variable = "var";

			fn(test);
			$.prevent_snippet_stringification(test);

			function test($$renderer) {
				$.validate_snippet_args($$renderer);
				$$renderer.push(`<!---->var`);
			}
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;