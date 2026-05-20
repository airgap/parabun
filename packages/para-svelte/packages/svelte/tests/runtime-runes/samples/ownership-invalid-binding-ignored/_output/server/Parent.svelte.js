import 'svelte/internal/flags/async';

Parent[$.FILENAME] = 'Parent.svelte';

import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

function Parent($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { test } = $$props;
			let $$settled = true;
			let $$inner_renderer;

			function $$render_inner($$renderer) {
				Child($$renderer, {
					get test() {
						return test;
					},

					set test($$value) {
						test = $$value;
						$$settled = false;
					}
				});
			}

			do {
				$$settled = true;
				$$inner_renderer = $$renderer.copy();
				$$render_inner($$inner_renderer);
			} while (!$$settled);

			$$renderer.subsume($$inner_renderer);
		},
		Parent
	);
}

Parent.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Parent;