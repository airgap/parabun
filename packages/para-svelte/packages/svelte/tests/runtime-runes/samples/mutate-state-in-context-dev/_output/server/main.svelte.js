import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

let obj = {};

obj.test = "hi!";

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			$$renderer.push(`<h1>`);
			$.push_element($$renderer, 'h1', 6, 0);
			$$renderer.push(`Values: ${$.escape(JSON.stringify(obj))}</h1>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;