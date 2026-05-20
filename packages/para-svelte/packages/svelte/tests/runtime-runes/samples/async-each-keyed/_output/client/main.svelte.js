import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<p> </p>`), Main[$.FILENAME], [[18, 2]]);
var root_2 = $.add_locations($.from_html(`<p>pending</p>`), Main[$.FILENAME], [[22, 2]]);
var root_4 = $.add_locations($.from_html(`<p> </p>`), Main[$.FILENAME], [[13, 3]]);
var root_3 = $.add_locations($.from_html(`<div><!></div>`), Main[$.FILENAME], [[11, 1]]);
var root = $.add_locations($.from_html(`<button>reset</button> <button>one</button> <button>two</button> <button>three</button> <!>`, 1), Main[$.FILENAME], [[5, 0], [6, 0], [7, 0], [8, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let deferred = $.tag($.state($.proxy(Promise.withResolvers())), 'deferred');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var button_3 = $.sibling(button_2, 2);
	var node = $.sibling(button_3, 2);

	{
		const failed = $.wrap_snippet(Main, function ($$anchor, e = $.noop) {
			$.validate_snippet_args(...arguments);

			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, e().message));
			$.append($$anchor, p);
		});

		const pending = $.wrap_snippet(Main, function ($$anchor) {
			$.validate_snippet_args(...arguments);

			var p_1 = root_2();

			$.append($$anchor, p_1);
		});

		$.boundary(node, { failed, pending }, ($$anchor) => {
			var div = root_3();
			var node_1 = $.child(div);

			$.async(
				node_1,
				[],
				[
					async () => (await $.track_reactivity_loss($.get(deferred).promise))()
				],
				(node_1, $$collection) => {
					$.add_svelte_meta(
						() => $.each(node_1, 16, () => $.get($$collection), (item) => item, ($$anchor, item) => {
							var p_2 = root_4();
							var text_1 = $.child(p_2, true);

							$.reset(p_2);
							$.template_effect(() => $.set_text(text_1, item));
							$.append($$anchor, p_2);
						}),
						'each',
						Main,
						12,
						2
					);
				}
			);

			$.reset(div);
			$.append($$anchor, div);
		});
	}

	$.delegated('click', button, function click() {
		return $.set(deferred, Promise.withResolvers(), true);
	});

	$.delegated('click', button_1, function click_1() {
		return $.get(deferred).resolve(['a', 'b', 'c']);
	});

	$.delegated('click', button_2, function click_2() {
		return $.get(deferred).resolve(['d', 'e', 'f', 'g']);
	});

	$.delegated('click', button_3, function click_3() {
		return $.get(deferred).resolve(['d', 'e', 'f', 'd']);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);