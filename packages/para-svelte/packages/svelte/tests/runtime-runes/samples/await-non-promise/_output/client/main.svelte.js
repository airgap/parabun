import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button>number</button> <button>nullify</button> <p><!></p>`, 1), Main[$.FILENAME], [[5, 0], [6, 0], [8, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(void 0), 'count');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var p = $.sibling(button_1, 2);
	var node = $.child(p);

	$.add_svelte_meta(
		() => $.await(
			node,
			() => $.get(count),
			($$anchor) => {
				var text_1 = $.text('loading');

				$.append($$anchor, text_1);
			},
			($$anchor, count) => {
				var text = $.text();

				$.template_effect(() => $.set_text(text, $.get(count)));
				$.append($$anchor, text);
			}
		),
		'await',
		Main,
		9,
		1
	);

	$.reset(p);

	$.delegated('click', button, function click() {
		return $.set(count, 1);
	});

	$.delegated('click', button_1, function click_1() {
		return $.set(count, null);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);