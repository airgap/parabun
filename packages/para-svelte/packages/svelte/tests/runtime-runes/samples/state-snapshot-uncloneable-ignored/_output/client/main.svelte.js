import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<div>a</div>`), Main[$.FILENAME], [[11, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let arr = $.tag_proxy($.proxy({ test: () => {} }), 'arr');

	// svelte-ignore state_snapshot_uncloneable
	$.snapshot(arr, true);

	var $$exports = { ...$.legacy_api() };
	var div = root();

	$.attribute_effect(div, ($0) => ({ ...$0 }), [() => $.snapshot(arr, true)]);
	$.append($$anchor, div);

	return $.pop($$exports);
}