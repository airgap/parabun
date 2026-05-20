import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

const data = { list: [], derived: 0 };
const derived = $.derived(() => data.list.filter(() => true));

const state = {
	data,
	get derived() {
		return derived();
	}
};

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			var $$store_subs;

			data.list.length = 0;
			console.log('$inspect(', state, ')');
			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 20, 0);
			$$renderer.push(`update</button>`);
			$.pop_element();
			$$renderer.push(` ${$.escape(state.data.list)}`);

			if ($$store_subs) $.unsubscribe_stores($$store_subs);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;