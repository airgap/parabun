import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Button from './Button.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count = 0;

			Button($$renderer, {
				onclick: count++,
				children: $.prevent_snippet_stringification(($$renderer) => {
					$$renderer.push(`<!---->clicks: ${$.escape(count)}`);
				}),
				$$slots: { default: true }
			});
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;