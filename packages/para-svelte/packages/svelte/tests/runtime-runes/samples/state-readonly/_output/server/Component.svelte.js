import 'svelte/internal/flags/async';

Component[$.FILENAME] = 'Component.svelte';

import * as $ from 'svelte/internal/server';
import Component2 from './Component2.svelte';

function Component($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			const { state } = $$props;

			function render(state) {
				return state;
			}

			Component2($$renderer, { state: render(state) });
		},
		Component
	);
}

Component.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Component;