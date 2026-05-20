import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';
import Child from './Child.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			var $$store_subs;
			let a = writable({ value: 0 });
			let b = writable({ nested: { value: 0 } });
			let $$settled = true;
			let $$inner_renderer;

			function $$render_inner($$renderer) {
				Child($$renderer, {
					get value() {
						return $.store_get($$store_subs ??= {}, '$a', a).value;
					},

					set value($$value) {
						$.store_mutate($$store_subs ??= {}, '$a', a, $.store_get($$store_subs ??= {}, '$a', a).value = $$value);
						$$settled = false;
					}
				});

				$$renderer.push(`<!----> `);

				Child($$renderer, {
					get value() {
						return $.store_get($$store_subs ??= {}, '$b', b).nested.value;
					},

					set value($$value) {
						$.store_mutate($$store_subs ??= {}, '$b', b, $.store_get($$store_subs ??= {}, '$b', b).nested.value = $$value);
						$$settled = false;
					}
				});

				$$renderer.push(`<!----> <p>`);
				$.push_element($$renderer, 'p', 11, 0);
				$$renderer.push(`${$.escape($.store_get($$store_subs ??= {}, '$a', a).value)}</p>`);
				$.pop_element();
				$$renderer.push(` <p>`);
				$.push_element($$renderer, 'p', 12, 0);
				$$renderer.push(`${$.escape($.store_get($$store_subs ??= {}, '$b', b).nested.value)}</p>`);
				$.pop_element();
			}

			do {
				$$settled = true;
				$$inner_renderer = $$renderer.copy();
				$$render_inner($$inner_renderer);
			} while (!$$settled);

			$$renderer.subsume($$inner_renderer);

			if ($$store_subs) $.unsubscribe_stores($$store_subs);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;