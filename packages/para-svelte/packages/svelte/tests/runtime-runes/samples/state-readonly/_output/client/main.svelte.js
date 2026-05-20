import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root = $.add_locations($.from_html(`<button></button> <!>`, 1), Main[$.FILENAME], [[7, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let state = $.tag($.state(void 0), 'state');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			$.add_svelte_meta(
				() => Component($$anchor, {
					get state() {
						return $.get(state);
					}
				}),
				'component',
				Main,
				11,
				1,
				{ componentTag: 'Component' }
			);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if ($.get(state)) $$render(consequent);
			}),
			'if',
			Main,
			10,
			0
		);
	}

	$.delegated('click', button, function click() {
		$.set(state, {}, true);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);