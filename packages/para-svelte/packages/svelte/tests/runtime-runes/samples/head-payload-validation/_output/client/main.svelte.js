import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

const head = $.wrap_snippet(Main, function ($$anchor) {
	$.validate_snippet_args(...arguments);

	var title = root_1();

	$.append($$anchor, title);
});

var root_1 = $.add_locations($.from_html(`<title>Cool</title>`), Main[$.FILENAME], [[2, 1]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };

	$.head('70s021', ($$anchor) => {
		$.add_svelte_meta(() => head($$anchor), 'render', Main, 6, 1);
	});

	return $.pop($$exports);
}