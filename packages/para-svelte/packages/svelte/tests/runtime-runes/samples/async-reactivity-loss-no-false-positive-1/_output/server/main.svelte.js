import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let x = 0;
			let y = 0;

			async function foo(x) {
				if (x) {
					await 1; // restores reactivity loss warning context
					await new Promise((r) => setTimeout(r, 10)); // saves reactivity loss warning context; should not keep it while running
				}

				return x;
			}

			$$renderer.push(`<!---->${$.escape(x)} `);
			$$renderer.push(async () => $.escape(await foo(y)));
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 15, 0);
			$$renderer.push(`x++</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 16, 0);
			$$renderer.push(`y++</button>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;