import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Form from './form.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<form>`);
			$.push_element($$renderer, 'form', 5, 0);
			$$renderer.push(`<div>`);
			$.push_element($$renderer, 'div', 6, 1);
			Form($$renderer, {});
			$$renderer.push(`<!----></div>`);
			$.pop_element();
			$$renderer.push(`</form>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;