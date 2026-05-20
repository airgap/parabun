import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let deferred = Promise.withResolvers();

			$.prevent_snippet_stringification(failed);

			function failed($$renderer, e) {
				$.validate_snippet_args($$renderer);
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 18, 2);
				$$renderer.push(`${$.escape(e.message)}</p>`);
				$.pop_element();
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 5, 0);
			$$renderer.push(`reset</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 6, 0);
			$$renderer.push(`one</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 7, 0);
			$$renderer.push(`two</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 8, 0);
			$$renderer.push(`three</button>`);
			$.pop_element();
			$$renderer.push(` `);

			$$renderer.boundary({ failed }, ($$renderer) => {
				$$renderer.push(`<!--[!-->`);

				{
					$$renderer.push(`<p>`);
					$.push_element($$renderer, 'p', 22, 2);
					$$renderer.push(`pending</p>`);
					$.pop_element();
				}

				$$renderer.push(`<!--]-->`);
			});
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;