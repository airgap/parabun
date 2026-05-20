import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button>Add</button> `, 1), Main[$.FILENAME], [[5, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let items = $.tag_proxy($.proxy([]), 'items');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.sibling(button);

	$.template_effect(($0) => $.set_text(text, ` ${$0 ?? ''}`), [() => JSON.stringify(items.sort())]);

	$.delegated('click', button, function click() {
		return items.push(3, 2, 1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);