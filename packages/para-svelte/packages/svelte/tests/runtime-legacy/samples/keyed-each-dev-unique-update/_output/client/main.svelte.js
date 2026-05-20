import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<li> </li>`), Main[$.FILENAME], [[19, 3]]);
var root = $.add_locations($.from_html(`<button>add</button> <ul></ul>`, 1), Main[$.FILENAME], [[15, 0], [17, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	let data = $.mutable_source([[0, 0], [0, 4], [1, 4]]);

	function add() {
		const n = [0, 0];

		$.get(data).push(n);
		$.set(data, $.get(data));
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var ul = $.sibling(button, 2);

	$.add_svelte_meta(
		() => $.each(ul, 5, () => $.get(data), (d) => d.join(""), ($$anchor, d) => {
			var li = root_1();
			var text = $.child(li, true);

			$.reset(li);
			$.template_effect(() => $.set_text(text, $.get(d)));
			$.append($$anchor, li);
		}),
		'each',
		Main,
		18,
		2
	);

	$.reset(ul);
	$.delegated('click', button, add);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);