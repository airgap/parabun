import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let condition = false;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 5, 0);
			$$renderer.push(`toggle</button>`);
			$.pop_element();
			$$renderer.push(` <p>`);
			$.push_element($$renderer, 'p', 7, 0);
			$$renderer.push(`before</p>`);
			$.pop_element();
			$$renderer.push(` `);

			if (condition) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<strong>`);
				$.push_element($$renderer, 'strong', 10, 1);
				$$renderer.push(`during</strong>`);
				$.pop_element();
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <p>`);
			$.push_element($$renderer, 'p', 13, 0);
			$$renderer.push(`after</p>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;