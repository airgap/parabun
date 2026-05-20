import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Entry from './Entry.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let array = [{ id: 1, hi: true }];

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 7, 0);
			$$renderer.push(`update</button>`);
			$.pop_element();
			$$renderer.push(` <!--[-->`);

			const each_array = $.ensure_array_like(array);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let entry = each_array[$$index];

				Entry($$renderer, { entry });
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