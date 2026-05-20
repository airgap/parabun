import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let foo = { value: 'a' };
			let state1 = foo;
			let state2 = foo;

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 7, 0);

			$$renderer.push(`state1.value: ${$.escape(
				// This contains Symbol.$state and Symbol.$readonly and we can't do anything against it,
				// because it's called on the original object, not our state proxy
				// $.proxy will see that Symbol.$state exists on this object already, which shouldn't result in a stale value
				// $.proxy can't look into Symbol.$state because of the frozen object
				state1.value
			)}
state2.value: ${$.escape(state2.value)}</button>`);

			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;