import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			var $$store_subs;
			const array = writable([{ name: "" }]);

			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like($.store_get($$store_subs ??= {}, '$array', array));

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let item = each_array[$$index];

				$$renderer.push(`<div>`);
				$.push_element($$renderer, 'div', 9, 1);
				$$renderer.push(`<input${$.attr('value', item.name)}/>`);
				$.push_element($$renderer, 'input', 9, 6);
				$.pop_element();
				$$renderer.push(`</div>`);
				$.pop_element();
			}

			$$renderer.push(`<!--]-->`);

			if ($$store_subs) $.unsubscribe_stores($$store_subs);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;