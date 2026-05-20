import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<div></div>`), Main[$.FILENAME], [[5, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	const create = 'deconflicted';
	var $$exports = { ...$.legacy_api() };
	var div = root();

	div.textContent = 'deconflicted';
	$.append($$anchor, div);

	return $.pop($$exports);
}