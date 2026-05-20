import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Component from "./Component.svelte";

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let open = true;
			let comp;
			let $$settled = true;
			let $$inner_renderer;

			function $$render_inner($$renderer) {
				Component($$renderer, {
					get open() {
						return open;
					},

					set open($$value) {
						open = $$value;
						$$settled = false;
					}
				});

				$$renderer.push(`<!----> <button>`);
				$.push_element($$renderer, 'button', 10, 0);
				$$renderer.push(`${$.escape(open)}</button>`);
				$.pop_element();
				$$renderer.push(` <input type="checkbox"${$.attr('checked', open, true)}/>`);
				$.push_element($$renderer, 'input', 14, 0);
				$.pop_element();
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