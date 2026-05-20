import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let uid = 0;

			/** @type {Array<{ id: number }>} */
			let items = [];

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 10, 0);
			$$renderer.push(`unshift</button>`);
			$.pop_element();
			$$renderer.push(` <!--[-->`);

			const each_array = $.ensure_array_like(items);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let item = each_array[$$index];

				Child($$renderer, {});
				$$renderer.push(`<!---->`);
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