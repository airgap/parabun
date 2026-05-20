import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

A[$.FILENAME] = 'A.svelte';

import * as $ from 'svelte/internal/client';

function A($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, A);

	var $$exports = { ...$.legacy_api() };

	$.next();

	var text = $.text('A');

	$.append($$anchor, text);

	return $.pop($$exports);
}

if (import.meta.hot) {
	A = $.hmr(A);

	import.meta.hot.accept((module) => {
		A[$.HMR].update(module.default);
	});
}

export default A;