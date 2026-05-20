import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

$.prevent_snippet_stringification(testSnippet);

function testSnippet($$renderer) {
	$.validate_snippet_args($$renderer);
	$$renderer.push(`<p>`);
	$.push_element($$renderer, 'p', 4, 2);
	$$renderer.push(`hi again</p>`);
	$.pop_element();
}

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<!---->${$.escape(testSnippet)}`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;