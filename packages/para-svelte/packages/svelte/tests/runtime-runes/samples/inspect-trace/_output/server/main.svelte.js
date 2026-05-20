import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let count = 0;
			let double = $.derived(() => count * 2);
			let checked = false;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 15, 0);
			$$renderer.push(`${$.escape(double())}</button>`);
			$.pop_element();
			$$renderer.push(` <input type="checkbox"${$.attr('checked', checked, true)}/>`);
			$.push_element($$renderer, 'input', 16, 0);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;