import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button type="button">Button</button>`), Main[$.FILENAME], [[1, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };
	var button = root();

	$.delegated('click', button, async function click() {
		(await $.track_reactivity_loss(Promise.resolve()))();
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);