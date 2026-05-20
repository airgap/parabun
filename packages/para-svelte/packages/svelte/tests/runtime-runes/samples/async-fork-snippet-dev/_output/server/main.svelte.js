import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { fork } from 'svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let condition = false;
			let checked = false;
			const d = $.derived(() => ({ checked }));

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 10, 0);
			$$renderer.push(`fork</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (condition) {
				$$renderer.push('<!--[0-->');
				$.prevent_snippet_stringification(foo);

				function foo($$renderer, { checked }) {
					$.validate_snippet_args($$renderer);
					$$renderer.push(`<!---->${$.escape(checked)}`);
				}

				$$renderer.push(`<button>`);
				$.push_element($$renderer, 'button', 23, 1);
				foo($$renderer, d());
				$$renderer.push(`<!----></button>`);
				$.pop_element();
			} else {
				$$renderer.push('<!--[-1-->');
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