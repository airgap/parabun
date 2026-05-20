import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Form from './form.svelte';
import H1 from './h1.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<p>`);
			$.push_element($$renderer, 'p', 6, 0);
			H1($$renderer, {});
			$$renderer.push(`<!----></p>`);
			$.pop_element();
			$$renderer.push(` <form>`);
			$.push_element($$renderer, 'form', 9, 0);
			Form($$renderer, {});
			$$renderer.push(`<!----></form>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;