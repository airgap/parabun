import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

List[$.FILENAME] = 'List.svelte';

import * as $ from 'svelte/internal/client';
import { setContext } from 'svelte';

var root = $.add_locations($.from_html(`<div class="list"><!></div>`), List[$.FILENAME], [[15, 0]]);

export default function List($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, List);

	let listContext = $.tag_proxy($.proxy({ selectedValue: $$props.selectedValue }), 'listContext');

	$.user_effect(() => {
		listContext.selectedValue = $$props.selectedValue;
	});

	setContext('list', listContext);

	var $$exports = { ...$.legacy_api() };
	var div = root();
	var node = $.child(div);

	$.add_svelte_meta(() => $.snippet(node, () => $$props.children), 'render', List, 16, 1);
	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}