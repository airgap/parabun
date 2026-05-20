import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Red from "./Red.svelte";
import Blue from "./Blue.svelte";

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			const comps = { Red, Blue };
			let activeComp = "Red";

			$$renderer.push(`<main>`);
			$.push_element($$renderer, 'main', 11, 0);
			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 12, 2);
			$$renderer.push(`toggle</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (comps[activeComp]) {
				$$renderer.push('<!--[-->');
				comps[activeComp]($$renderer, {});
				$$renderer.push('<!--]-->');
			} else {
				$$renderer.push('<!--[!-->');
				$$renderer.push('<!--]-->');
			}

			$$renderer.push(`</main>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;