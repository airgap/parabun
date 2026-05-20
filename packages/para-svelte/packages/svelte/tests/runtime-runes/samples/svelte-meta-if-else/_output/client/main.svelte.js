import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<p>during</p>`), Main[$.FILENAME], [[4, 1]]);
var root_2 = $.add_locations($.from_html(`<p>during</p>`), Main[$.FILENAME], [[6, 1]]);
var root_3 = $.add_locations($.from_html(`<p>during</p>`), Main[$.FILENAME], [[8, 1]]);
var root = $.add_locations($.from_html(`<p>before</p> <!> <p>after</p>`, 1), Main[$.FILENAME], [[1, 0], [11, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	{
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		var consequent_1 = ($$anchor) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		};

		var consequent_2 = ($$anchor) => {
			var p_2 = root_3();

			$.append($$anchor, p_2);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if (false) $$render(consequent); else if (true) $$render(consequent_1, 1); else if (false) $$render(consequent_2, 2);
			}),
			'if',
			Main,
			3,
			0
		);
	}

	$.next(2);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}