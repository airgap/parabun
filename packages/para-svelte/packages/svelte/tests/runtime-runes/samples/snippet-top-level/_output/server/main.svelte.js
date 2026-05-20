import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

$.prevent_snippet_stringification(snippet);

function snippet($$renderer) {
	$.validate_snippet_args($$renderer);
	$$renderer.push(`<p>`);
	$.push_element($$renderer, 'p', 6, 1);
	$$renderer.push(`hello world</p>`);
	$.pop_element();
}

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			const { children = snippet } = $$props;

			children($$renderer);
			$$renderer.push(`<!---->`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;