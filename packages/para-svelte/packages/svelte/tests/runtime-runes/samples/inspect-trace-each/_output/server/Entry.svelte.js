import 'svelte/internal/flags/async';

Entry[$.FILENAME] = 'Entry.svelte';

import * as $ from 'svelte/internal/server';

function Entry($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { entry } = $$props;
		},
		Entry
	);
}

Entry.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Entry;