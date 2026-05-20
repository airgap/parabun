import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Component1 from './Component1.svelte';
import Component2 from './Component2.svelte';
import Component3 from './Component3.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count = { value: 0 };
			let $$settled = true;
			let $$inner_renderer;

			function $$render_inner($$renderer) {
				Component1($$renderer, {
					children: $.prevent_snippet_stringification(($$renderer) => {
						Component2($$renderer, {
							children: $.prevent_snippet_stringification(($$renderer) => {
								Component3($$renderer, {
									get count() {
										return count;
									},

									set count($$value) {
										count = $$value;
										$$settled = false;
									}
								});
							}),
							$$slots: { default: true }
						});
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