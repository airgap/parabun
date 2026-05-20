import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

const snippet = $.wrap_snippet(Main, function ($$anchor) {
	$.validate_snippet_args(...arguments);

	var p = root_1();

	$.append($$anchor, p);
});

var root_1 = $.add_locations($.from_html(`<p>hello world</p>`), Main[$.FILENAME], [[6, 1]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const children = $.prop($$props, 'children', 3, snippet);
	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(() => $.snippet(node, children), 'render', Main, 4, 0);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}