import 'svelte/internal/flags/async';

Component1[$.FILENAME] = 'Component1.svelte';

import * as $ from 'svelte/internal/server';
import Component2 from './Component2.svelte';

function Component1($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { rows = [] } = $$props;
			let rows2 = [];
			let $$settled = true;
			let $$inner_renderer;

			function $$render_inner($$renderer) {
				Component2($$renderer, {
					get rows() {
						return rows2;
					},

					set rows($$value) {
						rows2 = $$value;
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
			$.bind_props($$props, { rows });
		},
		Component1
	);
}

Component1.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Component1;