Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let foo = $$props['foo'];

			Widget($$renderer, { value: `foo @ ${$.stringify(foo)} # foo` });
			$.bind_props($$props, { foo });
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;