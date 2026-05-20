import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button></button>`), Child[$.FILENAME], [[5, 0]]);

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	var $$exports = { ...$.legacy_api() };
	var button = root();

	$.delegated('click', button, function click() {
		return $$props.arr.push($$props.arr.length);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);