import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let things = [{ group: 'a', id: 1 }, { group: 'b', id: 2 }];

			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like(things);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let thing = each_array[$$index];

				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 9, 1);
				$$renderer.push(`${$.escape(thing.group)}-${$.escape(thing.id)}</p>`);
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