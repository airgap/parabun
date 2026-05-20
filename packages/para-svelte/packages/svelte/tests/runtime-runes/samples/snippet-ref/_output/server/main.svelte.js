import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let thisBug;

			$.prevent_snippet_stringification(Bug);

			function Bug($$renderer) {
				$.validate_snippet_args($$renderer);
				$$renderer.push(`<!---->cool`);
			}

			$$renderer.push(`<form>`);
			$.push_element($$renderer, 'form', 5, 0);
			$$renderer.push(`</form>`);
			$.pop_element();
			$$renderer.push(` ${$.escape(typeof thisBug)}`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;