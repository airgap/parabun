import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Outer from './Outer.svelte';
import Inner from './Inner.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let object = { count: 0 };
			let test = true;
			let $$settled = true;
			let $$inner_renderer;

			function $$render_inner($$renderer) {
				Outer($$renderer, {
					children: $.prevent_snippet_stringification(($$renderer) => {
						if (test) {
							$$renderer.push('<!--[0-->');

							Inner($$renderer, {
								get object() {
									return object;
								},

								set object($$value) {
									object = $$value;
									$$settled = false;
								}
							});
						} else {
							$$renderer.push('<!--[-1-->');
						}

						$$renderer.push(`<!--]-->`);
					}),
					$$slots: { default: true }
				});
			}

			do {
				$$settled = true;
				$$inner_renderer = $$renderer.copy();
				$$render_inner($$inner_renderer);
			} while (!$$settled);

			$$renderer.subsume($$inner_renderer);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;