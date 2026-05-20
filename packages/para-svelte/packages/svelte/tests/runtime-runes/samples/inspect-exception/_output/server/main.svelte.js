import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let s = { a: { "1": "a", "2": "b" } };
			let $$settled = true;
			let $$inner_renderer;

			function $$render_inner($$renderer) {
				$$renderer.push(`<button>`);
				$.push_element($$renderer, 'button', 7, 0);
				$$renderer.push(`Set State</button>`);
				$.pop_element();
				$$renderer.push(` `);

				if (s.a) {
					$$renderer.push('<!--[0-->');
					$$renderer.push(`<!--[-->`);

					const each_array = $.ensure_array_like(Object.entries(s.a));

					for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
						let [k, v] = each_array[$$index];

						Component($$renderer, {
							get a() {
								return s.a[k];
							},

							set a($$value) {
								s.a[k] = $$value;
								$$settled = false;
							}
						});
					}

					$$renderer.push(`<!--]-->`);
				} else {
					$$renderer.push('<!--[-1-->');
				}

				$$renderer.push(`<!--]-->`);
			}

			do {
				$$settled = true;
				$$inner_renderer = $$renderer.copy();
				$$render_inner($$inner_renderer);
			} while (!$$settled);

			$$renderer.subsume($$inner_renderer);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;