import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count = 0;

			function process(count) {
				if (count === 3) throw new Error('kaboom');

				return count;
			}

			$.prevent_snippet_stringification(failed);

			function failed($$renderer, error, reset) {
				$.validate_snippet_args($$renderer);
				$$renderer.push(`<button>`);
				$.push_element($$renderer, 'button', 22, 2);
				$$renderer.push(`retry</button>`);
				$.pop_element();
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 10, 0);
			$$renderer.push(`clicks: ${$.escape(count)}</button>`);
			$.pop_element();
			$$renderer.push(` `);

			$$renderer.boundary({ failed }, ($$renderer) => {
				$$renderer.push(`<!--[!-->`);

				{
					$$renderer.push(`<p>`);
					$.push_element($$renderer, 'p', 18, 2);
					$$renderer.push(`pending...</p>`);
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