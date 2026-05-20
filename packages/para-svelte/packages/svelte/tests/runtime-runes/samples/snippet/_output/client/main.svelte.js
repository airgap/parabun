import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

const hello = $.wrap_snippet(Main, function ($$anchor) {
	$.validate_snippet_args(...arguments);

	var p = root_1();

	$.append($$anchor, p);
});

var root_1 = $.add_locations($.from_html(`<p>hello world</p>`), Main[$.FILENAME], [[2, 1]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(() => hello($$anchor), 'render', Main, 5, 0);

	return $.pop($$exports);
}