import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			function createState(init) {
				let values = init;

				return {
					get value() {
						return $.snapshot(values);
					},

					get workedValues() {
						let newValue = [];

						for (const value of values) {
							if (value === undefined) {
								throw new Error('undefined found');
							}

							newValue.push(value);
						}

						return newValue;
					},

					doSplice() {
						values.splice(0, 1);
					}
				};
			}

			const myState = createState([1, 2, 3, 7]);

			console.log('$inspect(', myState.workedValues, ')');
			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 33, 0);
			$$renderer.push(`Delete</button>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;