import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<h1>hello!</h1>`), Main[$.FILENAME], [[2, 1]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.async(node, [], [async () => (await $.track_reactivity_loss(true))()], (node, $$condition) => {
		var consequent = ($$anchor) => {
			var h1 = root_1();

			$.append($$anchor, h1);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if ($.get($$condition)) $$render(consequent);
			}),
			'if',
			Main,
			1,
			0
		);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}