import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count = 0;
			let other = 0;

			function delayed(value, ms = 1000) {
				return new Promise((f) => setTimeout(() => f(value), ms));
			}

			async function foo() {
				await new Promise((r) => setTimeout(r, 10));
			}

			async function bar() {
				const value = await delayed(count, 10);

				other; // should trigger warning

				return value;
			}

			async function get() {
				foo();

				return await bar();
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 25, 0);
			$$renderer.push(`${$.escape(count)}</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 26, 0);
			$$renderer.push(`${$.escape(other)}</button>`);
			$.pop_element();
			$$renderer.push(` `);
			$$renderer.push(async () => $.escape(await get()));
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;