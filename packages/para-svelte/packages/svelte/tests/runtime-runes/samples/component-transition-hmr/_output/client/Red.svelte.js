import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Red[$.FILENAME] = 'Red.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<div class="red"></div>`), Red[$.FILENAME], [[10, 0]]);

function Red($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Red);

	function show(node) {
		return { duration: 500, css: (t) => `opacity: ${t}` };
	}

	var $$exports = { ...$.legacy_api() };
	var div = root();

	$.transition(1, div, () => show);
	$.append($$anchor, div);

	return $.pop($$exports);
}

if (import.meta.hot) {
	Red = $.hmr(Red);

	import.meta.hot.accept((module) => {
		Red[$.HMR].update(module.default);
	});
}

export default Red;