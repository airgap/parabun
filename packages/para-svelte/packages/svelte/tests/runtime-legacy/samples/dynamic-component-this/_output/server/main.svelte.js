Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Test from './Test.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let div;
			let $$settled = true;
			let $$inner_renderer;

			function $$render_inner($$renderer) {
				if (Test) {
					$$renderer.push('<!--[-->');

					Test($$renderer, {
						get div() {
							return div;
						},

						set div($$value) {
							div = $$value;
							$$settled = false;
						}
					});

					$$renderer.push('<!--]-->');
				} else {
					$$renderer.push('<!--[!-->');
					$$renderer.push('<!--]-->');
				}
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