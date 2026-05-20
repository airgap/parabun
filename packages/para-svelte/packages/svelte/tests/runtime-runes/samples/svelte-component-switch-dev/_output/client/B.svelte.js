import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

B[$.FILENAME] = 'B.svelte';

import * as $ from 'svelte/internal/client';

function B($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, B);

	var $$exports = { ...$.legacy_api() };

	$.next();

	var text = $.text('B');

	$.append($$anchor, text);

	return $.pop($$exports);
}

if (import.meta.hot) {
	B = $.hmr(B);

	import.meta.hot.accept((module) => {
		B[$.HMR].update(module.default);
	});
}

export default B;