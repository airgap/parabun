import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<p>pending</p>`), Main[$.FILENAME], [[22, 2]]);
var root_2 = $.add_locations($.from_html(`<h1> </h1>`), Main[$.FILENAME], [[19, 1]]);
var root = $.add_locations($.from_html(`<button>a</button> <button>b</button> <!>`, 1), Main[$.FILENAME], [[15, 0], [16, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let values = $.tag_proxy($.proxy([1, 2]), 'values');

	async function get_total() {
		let total = 0;

		for await (const n of $.for_await_track_reactivity_loss(values)) {
			total += n;
		}

		return total;
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	{
		const pending = $.wrap_snippet(Main, function ($$anchor) {
			$.validate_snippet_args(...arguments);

			var p = root_1();

			$.append($$anchor, p);
		});

		$.boundary(node, { pending }, ($$anchor) => {
			var h1 = root_2();
			var text = $.child(h1, true);

			$.reset(h1);
			$.template_effect(($0) => $.set_text(text, $0), void 0, [async () => (await $.track_reactivity_loss(get_total()))()]);
			$.append($$anchor, h1);
		});
	}

	$.delegated('click', button, function click() {
		return values[0]++;
	});

	$.delegated('click', button_1, function click_1() {
		return values[1]++;
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);