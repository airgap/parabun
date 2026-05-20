import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import A from './A.svelte';
import B from './B.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let component = A;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 8, 0);
			$$renderer.push(`switch</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (component) {
				$$renderer.push('<!--[-->');
				component($$renderer, {});
				$$renderer.push('<!--]-->');
			} else {
				$$renderer.push('<!--[!-->');
				$$renderer.push('<!--]-->');
			}
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;