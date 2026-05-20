import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Pre from "./pre.svelte";

$.prevent_snippet_stringification(snip);

function snip($$renderer) {
	$.validate_snippet_args($$renderer);
	$$renderer.push(`<!---->C`);
}

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<!---->A B `);
			snip($$renderer);
			$$renderer.push(`<!----> D `);

			Pre($$renderer, {
				children: $.prevent_snippet_stringification(($$renderer) => {
					$$renderer.push(`<!---->Testing
123          ;
    456`);
				}),
				$$slots: { default: true }
			});

			$$renderer.push(`<!---->`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;