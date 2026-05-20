import 'svelte/internal/flags/async';

Form[$.FILENAME] = 'form.svelte';

import * as $ from 'svelte/internal/server';

function Form($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<form>`);
			$.push_element($$renderer, 'form', 1, 0);
			$$renderer.push(`</form>`);
			$.pop_element();
		},
		Form
	);
}

Form.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Form;