import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root = $.add_locations($.from_html(`<button>First click here</button> <!>`, 1), Main[$.FILENAME], [[12, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let items = $.tag_proxy(
		$.proxy([
			{ id: "test", name: "this is a test" },
			{ id: "test2", name: "this is a second test" }
		]),
		'items'
	);

	let found = $.tag($.state(void 0), 'found');

	function onclick() {
		$.set(found, items.find((c) => $.strict_equals(c.id, 'test2')), true);
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.add_svelte_meta(
		() => Child(node, {
			get item() {
				return $.get(found);
			}
		}),
		'component',
		Main,
		13,
		0,
		{ componentTag: 'Child' }
	);

	$.delegated('click', button, onclick);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);