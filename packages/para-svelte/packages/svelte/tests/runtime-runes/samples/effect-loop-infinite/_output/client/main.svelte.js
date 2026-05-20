import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button>toggle</button>`), Main[$.FILENAME], [[12, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let condition = $.tag($.state(false), 'condition');
	let count = $.tag($.state(0), 'count');

	$.user_effect(() => {
		if ($.get(condition)) {
			$.update(count);
		}
	});

	var $$exports = { ...$.legacy_api() };
	var button = root();

	$.delegated('click', button, function click() {
		return $.set(condition, !$.get(condition));
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);