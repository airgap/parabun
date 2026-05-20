import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			class Counter {
				#count;

				constructor() {
					const instance = this;

					instance.#count = 1;
				}

				get count() {
					return this.#count;
				}

				get count2() {
					const instance = this;

					return instance.#count;
				}
			}

			const counter = new Counter();

			console.log('$inspect(', counter.count, ')');
			console.log('$inspect(', counter.count2, ')');
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;