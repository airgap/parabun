import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let values = [1, 2];

			async function get_total() {
				let total = 0;

				for await (const n of values) {
					total += n;
				}

				return total;
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 15, 0);
			$$renderer.push(`a</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 16, 0);
			$$renderer.push(`b</button>`);
			$.pop_element();
			$$renderer.push(` `);
			$$renderer.push(`<!--[!-->`);

			{
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 22, 2);
				$$renderer.push(`pending</p>`);
				$.pop_element();
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