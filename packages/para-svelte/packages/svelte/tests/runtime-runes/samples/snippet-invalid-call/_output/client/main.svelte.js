import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

const test = $.wrap_snippet(Main, function ($$anchor) {
	$.validate_snippet_args(...arguments);

	var p = root_1();

	$.append($$anchor, p);
});

var root_1 = $.add_locations($.from_html(`<p>hello</p>`), Main[$.FILENAME], [[6, 1]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);
	test();

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}