import 'svelte/internal/flags/async';

Button[$.FILENAME] = 'Button.svelte';

import * as $ from 'svelte/internal/server';

function Button($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { children, onclick } = $$props;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 5, 0);
			children($$renderer);
			$$renderer.push(`<!----></button>`);
			$.pop_element();
		},
		Button
	);
}

Button.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Button;