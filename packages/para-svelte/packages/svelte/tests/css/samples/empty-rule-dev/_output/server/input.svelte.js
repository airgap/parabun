Input[$.FILENAME] = 'packages/svelte/tests/css/samples/empty-rule-dev/input.svelte';

import * as $ from 'svelte/internal/server';

function Input($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<div class="foo svelte-xyz">`);
			$.push_element($$renderer, 'div', 1, 0);
			$$renderer.push(`</div>`);
			$.pop_element();
		},
		Input
	);
}

Input.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Input;