import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<form></form> `, 1), Main[$.FILENAME], [[5, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let thisBug;
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var form = $.first_child(fragment);

	{
		const Bug = $.wrap_snippet(Main, function ($$anchor) {
			$.validate_snippet_args(...arguments);
			$.next();

			var text = $.text('cool');

			$.append($$anchor, text);
		});

		$.bind_this(form, ($$value) => thisBug = $$value, () => thisBug);
	}

	var text_1 = $.sibling(form);

	$.template_effect(() => $.set_text(text_1, ` ${typeof thisBug}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}