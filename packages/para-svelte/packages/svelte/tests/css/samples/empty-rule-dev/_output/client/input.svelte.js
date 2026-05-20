import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Input[$.FILENAME] = 'packages/svelte/tests/css/samples/empty-rule-dev/input.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<div class="foo svelte-xyz"></div>`), Input[$.FILENAME], [[1, 0]]);

export default function Input($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Input);

	var $$exports = { ...$.legacy_api() };
	var div = root();

	$.append($$anchor, div);

	return $.pop($$exports);
}