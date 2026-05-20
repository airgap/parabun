import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Component[$.FILENAME] = 'Component.svelte';

import * as $ from 'svelte/internal/client';

function Component($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Component);

	var $$exports = { ...$.legacy_api() };

	$.next();

	var text = $.text('component');

	$.append($$anchor, text);

	return $.pop($$exports);
}

if (import.meta.hot) {
	Component = $.hmr(Component);

	import.meta.hot.accept((module) => {
		Component[$.HMR].update(module.default);
	});
}

export default Component;