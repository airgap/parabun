import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Nested[$.FILENAME] = 'Nested.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<div>This is nested</div>`), Nested[$.FILENAME], [[1, 0]]);

export default function Nested($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Nested);

	var $$exports = { ...$.legacy_api() };
	var div = root();

	$.append($$anchor, div);

	return $.pop($$exports);
}