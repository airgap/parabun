import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<p>`);
			$.push_element($$renderer, 'p', 1, 0);
			$$renderer.push(`before</p>`);
			$.pop_element();
			$$renderer.push(` `);

			if (false) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 4, 1);
				$$renderer.push(`during</p>`);
				$.pop_element();
			} else if (true) {
				$$renderer.push('<!--[1-->');
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 6, 1);
				$$renderer.push(`during</p>`);
				$.pop_element();
			} else if (false) {
				$$renderer.push('<!--[2-->');
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 8, 1);
				$$renderer.push(`during</p>`);
				$.pop_element();
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <p>`);
			$.push_element($$renderer, 'p', 11, 0);
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