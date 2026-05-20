import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

TabList[$.FILENAME] = 'TabList.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<div class="tab-list"><!></div>`), TabList[$.FILENAME], [[1, 0]]);

export default function TabList($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, TabList);

	var $$exports = { ...$.legacy_api() };
	var div = root();
	var node = $.child(div);

	$.slot(node, $$props, 'default', {}, null);
	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}