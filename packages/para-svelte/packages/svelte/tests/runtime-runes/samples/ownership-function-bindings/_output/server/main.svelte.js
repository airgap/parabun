import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let arr = [];
			let arr2 = [];
			let len = $.derived(() => arr.length + arr2.length);
			let $$settled = true;
			let $$inner_renderer;

			function $$render_inner($$renderer) {
				var bind_get = () => len() % 2 === 0 ? arr : arr2;
				var bind_set = (v) => {};

				Child($$renderer, {
					get arr() {
						return bind_get();
					},

					set arr($$value) {
						bind_set($$value);
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
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;