import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Child from './child.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			class X {
				y = 1;
			}

			const klass = new X();
			let y = 1;

			const getter_setter = {
				get y() {
					return y;
				},

				set y(value) {
					y = value;
				}
			};

			Child($$renderer, { klass, getter_setter });
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;