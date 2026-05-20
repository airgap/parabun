import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<strong>during</strong>`), Main[$.FILENAME], [[10, 1]]);
var root = $.add_locations($.from_html(`<button>toggle</button> <p>before</p> <!> <p>after</p>`, 1), Main[$.FILENAME], [[5, 0], [7, 0], [13, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let condition = $.tag($.state(false), 'condition');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 4);

	{
		var consequent = ($$anchor) => {
			var strong = root_1();

			$.append($$anchor, strong);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if ($.get(condition)) $$render(consequent);
			}),
			'if',
			Main,
			9,
			0
		);
	}

	$.next(2);

	$.delegated('click', button, function click() {
		return $.set(condition, !$.get(condition));
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);