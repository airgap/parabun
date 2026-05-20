import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Entry from './Entry.svelte';

var root = $.add_locations($.from_html(`<button>update</button> <!>`, 1), Main[$.FILENAME], [[7, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let array = $.tag($.state($.proxy([{ id: 1, hi: true }])), 'array');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.add_svelte_meta(
		() => $.each(node, 17, () => $.get(array), (entry) => entry.id, ($$anchor, entry) => {
			$.add_svelte_meta(
				() => Entry($$anchor, {
					get entry() {
						return $.get(entry);
					}
				}),
				'component',
				Main,
				10,
				1,
				{ componentTag: 'Entry' }
			);
		}),
		'each',
		Main,
		9,
		0
	);

	$.delegated('click', button, function click() {
		return $.set(array, [{ id: 1, hi: false }], true);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);