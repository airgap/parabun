import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<p>hello</p>`), Child[$.FILENAME], [[1, 0]]);

function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	var $$exports = { ...$.legacy_api() };
	var p = root();

	$.append($$anchor, p);

	return $.pop($$exports);
}

if (import.meta.hot) {
	Child = $.hmr(Child);

	import.meta.hot.accept((module) => {
		Child[$.HMR].update(module.default);
	});
}

export default Child;