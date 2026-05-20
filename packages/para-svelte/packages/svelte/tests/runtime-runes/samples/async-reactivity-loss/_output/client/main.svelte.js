import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { untrack } from 'svelte';

var root_1 = $.add_locations($.from_html(`<p>pending</p>`), Main[$.FILENAME], [[21, 2]]);
var root_2 = $.add_locations($.from_html(`<h1> </h1> <p> </p>`, 1), Main[$.FILENAME], [[17, 1], [18, 1]]);
var root = $.add_locations($.from_html(`<button>a</button> <button>b</button> <button>c</button> <!>`, 1), Main[$.FILENAME], [[12, 0], [13, 0], [14, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let a = $.tag($.state(1), 'a');
	let b = $.tag($.state(2), 'b');
	let c = $.tag($.state(3), 'c');

	async function a_plus_b_plus_c() {
		return (await $.track_reactivity_loss($.get(a)))() + (await $.track_reactivity_loss($.get(b)))() + (await $.track_reactivity_loss(untrack(() => $.get(c))))();
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var node = $.sibling(button_2, 2);

	{
		const pending = $.wrap_snippet(Main, function ($$anchor) {
			$.validate_snippet_args(...arguments);

			var p = root_1();

			$.append($$anchor, p);
		});

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_2();
			var h1 = $.first_child(fragment_1);
			var text = $.child(h1, true);

			$.reset(h1);

			var p_1 = $.sibling(h1, 2);
			var text_1 = $.child(p_1, true);

			$.reset(p_1);

			$.template_effect(
				($0, $1) => {
					$.set_text(text, $0);
					$.set_text(text_1, $1);
				},
				void 0,
				[
					async () => (await $.track_reactivity_loss(a_plus_b_plus_c()))(),
					async () => (await $.save($.get(a)))() + (await $.save($.get(b)))() + (await $.track_reactivity_loss($.get(c)))()
				]
			);

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, function click() {
		return $.update(a);
	});

	$.delegated('click', button_1, function click_1() {
		return $.update(b);
	});

	$.delegated('click', button_2, function click_2() {
		return $.update(c);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);