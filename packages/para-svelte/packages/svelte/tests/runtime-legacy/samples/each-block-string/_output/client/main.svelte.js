import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<div> </div>`), Main[$.FILENAME], [[2, 1]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => $.each(node, 0, () => 'foo', $.index, ($$anchor, c) => {
			var div = root_1();
			var text = $.child(div, true);

			$.reset(div);
			$.template_effect(() => $.set_text(text, c));
			$.append($$anchor, div);
		}),
		'each',
		Main,
		1,
		0
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}