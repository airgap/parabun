import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			/** @type {{ push: (v: any) => void }} */
			let { push } = $$props;

			let x = 'x';
			let y = $.derived(() => x.toUpperCase());

			push('init', y());
			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 11, 0);
			$$renderer.push(`${$.escape(x)}</button>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;