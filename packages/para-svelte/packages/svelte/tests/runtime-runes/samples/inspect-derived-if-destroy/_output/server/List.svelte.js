import 'svelte/internal/flags/async';

List[$.FILENAME] = 'List.svelte';

import * as $ from 'svelte/internal/server';

function List($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { things } = $$props;

			console.log('$inspect(', things, ')');
			$$renderer.push(`<ul>`);
			$.push_element($$renderer, 'ul', 7, 0);
			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like(things);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let thing = each_array[$$index];

				$$renderer.push(`<li>`);
				$.push_element($$renderer, 'li', 9, 2);
				$$renderer.push(`thing ${$.escape(thing.id)}</li>`);
				$.pop_element();
			}

			$$renderer.push(`<!--]--></ul>`);
			$.pop_element();
		},
		List
	);
}

List.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default List;