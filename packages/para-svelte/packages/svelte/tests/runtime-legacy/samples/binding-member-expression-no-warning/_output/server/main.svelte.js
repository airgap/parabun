Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let object = { value: 'hello' };

			$$renderer.push(`<input${$.attr('value', object.value)}/>`);
			$.push_element($$renderer, 'input', 5, 0);
			$.pop_element();
			$$renderer.push(` <p>`);
			$.push_element($$renderer, 'p', 6, 0);
			$$renderer.push(`${$.escape(object.value)}</p>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;