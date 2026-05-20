import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { fn } from "./fn.js";

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const test = $.wrap_snippet(Main, function ($$anchor) {
		$.validate_snippet_args(...arguments);
		$.next();

		var text = $.text();

		text.nodeValue = 'var';
		$.append($$anchor, text);
	});

	let variable = "var";

	fn(test);

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}