import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<p> </p>`), Main[$.FILENAME], [[7, 2]]);
var root = $.add_locations($.from_html(`<button>Add</button> <!>`, 1), Main[$.FILENAME], [[5, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let items = $.tag_proxy($.proxy([]), 'items');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.add_svelte_meta(
		() => $.each(node, 16, () => items.sort(), (item) => item, ($$anchor, item) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, item));
			$.append($$anchor, p);
		}),
		'each',
		Main,
		6,
		0
	);

	$.delegated('click', button, function click() {
		return items.push(3, 2, 1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);