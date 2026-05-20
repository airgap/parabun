import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import List from "./List.svelte";

var root = $.add_locations($.from_html(`<!> <button>clear</button>`, 1), Main[$.FILENAME], [[15, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let data = $.tag($.state($.proxy({ things: [{ id: 1 }, { id: 2 }] })), 'data');

	function reloadData() {
		$.set(data, null);
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			{
				let $0 = $.derived(() => $.get(data).things.map((t) => t));

				$.add_svelte_meta(
					() => List($$anchor, {
						get things() {
							return $.get($0);
						}
					}),
					'component',
					Main,
					12,
					2,
					{ componentTag: 'List' }
				);
			}
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if ($.get(data)) $$render(consequent);
			}),
			'if',
			Main,
			11,
			0
		);
	}

	var button = $.sibling(node, 2);

	$.delegated('click', button, function click() {
		return reloadData();
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);