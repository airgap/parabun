import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

$.prevent_snippet_stringification(head);

function head($$renderer) {
	$.validate_snippet_args($$renderer);
	$$renderer.push(`<title>`);
	$.push_element($$renderer, 'title', 2, 1);
	$$renderer.push(`Cool</title>`);
	$.pop_element();
}

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$.head('70s021', $$renderer, ($$renderer) => {
				head($$renderer);
			});
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;