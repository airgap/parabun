import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			class Counter {
				#count;

				constructor() {
					this.#count = 0;
				}

				get count() {
					return this.#count;
				}

				increment = () => {
					this.#count += 1;
				};
			}

			const counter = new Counter();

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 26, 0);
			$$renderer.push(`clicks: ${$.escape(counter.count)}</button>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;