import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Inner from './inner.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			Inner($$renderer, {
				children: $.invalid_default_snippet,
				$$slots: {
					default: ($$renderer, { foo }) => {
						$$renderer.push(`<!---->${$.escape(foo)}`);
					}
				}
			});
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;