import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Blue[$.FILENAME] = 'Blue.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<div></div>`), Blue[$.FILENAME], [[1, 0]]);

function Blue($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Blue);

	var $$exports = { ...$.legacy_api() };
	var div = root();

	$.append($$anchor, div);

	return $.pop($$exports);
}

if (import.meta.hot) {
	Blue = $.hmr(Blue);

	import.meta.hot.accept((module) => {
		Blue[$.HMR].update(module.default);
	});
}

export default Blue;