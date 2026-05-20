import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Sub from './sub.svelte';
import { create_my_state } from './state.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			const myState = create_my_state();

			Sub($$renderer, { count: myState.my_state, inc: myState.inc });
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;