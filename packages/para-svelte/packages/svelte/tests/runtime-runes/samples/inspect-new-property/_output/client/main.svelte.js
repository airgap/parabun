import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button>add prop</button>`), Main[$.FILENAME], [[9, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let obj = $.tag_proxy($.proxy({}), 'obj');
	let array = $.tag_proxy($.proxy([]), 'array');

	$.inspect(() => [obj], (...$$args) => console.log(...$$args), true);
	$.inspect(() => [array], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };
	var button = root();

	$.delegated('click', button, function click() {
		obj.x = "hello";
		array[0] = "hello";
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);