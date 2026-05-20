import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let values = [0, 1, 2];

			async function get_result() {
				const logs = [];

				const iterator = {
					index: 0,
					async next() {
						if (this.index >= values.length) return { done: true };

						return { done: false, value: values[this.index++] };
					},

					async return() {
						logs.push('return');

						return { done: true };
					},

					[Symbol.asyncIterator]() {
						return this;
					}
				};

				for await (const value of iterator) {
					logs.push('number');

					// read reactive state after async iterator await
					if (values.length === 3 && value === 2) {
						break;
					}
				}

				logs.push('ended');

				return logs.join(' -> ');
			}

			$$renderer.push(`<!--[!-->`);

			{
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 39, 2);
				$$renderer.push(`pending</p>`);
				$.pop_element();
			}

			$$renderer.push(`<!--]-->`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;