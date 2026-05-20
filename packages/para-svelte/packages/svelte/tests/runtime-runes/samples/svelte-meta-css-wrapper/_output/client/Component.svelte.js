import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Component[$.FILENAME] = 'Component.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<h2 class="svelte-lsmn3l">hello from component</h2>`), Component[$.FILENAME], [[1, 0]]);

export default function Component($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Component);

	var $$exports = { ...$.legacy_api() };
	var h2 = root();

	$.append($$anchor, h2);

	return $.pop($$exports);
}