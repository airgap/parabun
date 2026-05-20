import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<p>hi</p>`), Child[$.FILENAME], [[1, 0]]);

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	var $$exports = { ...$.legacy_api() };
	var p = root();

	$.append($$anchor, p);

	return $.pop($$exports);
}