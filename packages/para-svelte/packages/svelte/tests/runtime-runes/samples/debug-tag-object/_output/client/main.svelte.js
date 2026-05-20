import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button>+</button>`), Main[$.FILENAME], [[7, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag_proxy($.proxy({ current: 0 }), 'count');
	var $$exports = { ...$.legacy_api() };
	var button = root();

	$.template_effect(() => {
		console.log({ count: $.snapshot(count) });

		debugger;
	});

	$.delegated('click', button, function click() {
		return count.current++;
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);