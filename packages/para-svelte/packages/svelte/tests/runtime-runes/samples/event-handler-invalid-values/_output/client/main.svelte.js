import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button>click</button> <button>click</button> <button>click</button>`, 1), Main[$.FILENAME], [[8, 0], [9, 0], [10, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let ignore = null;
	let handler = () => console.log("clicked");
	let bad = "invalid";
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);

	$.delegated('click', button, function (...$$args) {
		$.apply(() => ignore, this, $$args, Main, [8, 17]);
	});

	$.delegated('click', button_1, handler);

	$.delegated('click', button_2, function (...$$args) {
		$.apply(() => bad, this, $$args, Main, [10, 17]);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);