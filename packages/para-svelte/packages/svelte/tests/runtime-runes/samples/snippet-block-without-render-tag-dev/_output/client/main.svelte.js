import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

const testSnippet = $.wrap_snippet(Main, function ($$anchor) {
	$.validate_snippet_args(...arguments);

	var p = root_1();

	$.append($$anchor, p);
});

var root_1 = $.add_locations($.from_html(`<p>hi again</p>`), Main[$.FILENAME], [[4, 2]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, testSnippet));
	$.append($$anchor, text);

	return $.pop($$exports);
}