import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

H1[$.FILENAME] = 'h1.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<h1>foo</h1>`), H1[$.FILENAME], [[1, 0]]);

export default function H1($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, H1);

	var $$exports = { ...$.legacy_api() };
	var h1 = root();

	$.append($$anchor, h1);

	return $.pop($$exports);
}