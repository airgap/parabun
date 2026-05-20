import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count = 0;

			function listen(node) {
				function handler() {
					count++;
				}

				node.addEventListener("click", handler);

				return {
					destroy() {
						node.removeEventListener("click", handler);
					}
				};
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 17, 0);
			$$renderer.push(`</button>`);
			$.pop_element();
			$$renderer.push(` `);

			$.await($$renderer, Promise.resolve(), () => {}, () => {
				$$renderer.push(`${$.escape(err.or)}`);
			});

			$$renderer.push(`<!--]-->`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;