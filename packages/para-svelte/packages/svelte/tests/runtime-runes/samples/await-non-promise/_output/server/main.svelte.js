import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count = void 0;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 5, 0);
			$$renderer.push(`number</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 6, 0);
			$$renderer.push(`nullify</button>`);
			$.pop_element();
			$$renderer.push(` <p>`);
			$.push_element($$renderer, 'p', 8, 0);

			$.await(
				$$renderer,
				count,
				() => {
					$$renderer.push(`loading`);
				},
				(count) => {
					$$renderer.push(`${$.escape(count)}`);
				}
			);

			$$renderer.push(`<!--]--></p>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;