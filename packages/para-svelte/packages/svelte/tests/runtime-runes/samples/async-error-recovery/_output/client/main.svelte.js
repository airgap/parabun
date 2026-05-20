import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<p>pending...</p>`), Main[$.FILENAME], [[18, 2]]);
var root_2 = $.add_locations($.from_html(`<button>retry</button>`), Main[$.FILENAME], [[22, 2]]);
var root_3 = $.add_locations($.from_html(`<p> </p>`), Main[$.FILENAME], [[15, 1]]);
var root = $.add_locations($.from_html(`<button> </button> <!>`, 1), Main[$.FILENAME], [[10, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(0), 'count');

	function process(count) {
		if ($.strict_equals(count, 3)) throw new Error('kaboom');

		return count;
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var node = $.sibling(button, 2);

	{
		const pending = $.wrap_snippet(Main, function ($$anchor) {
			$.validate_snippet_args(...arguments);

			var p = root_1();

			$.append($$anchor, p);
		});

		const failed = $.wrap_snippet(Main, function ($$anchor, error = $.noop, reset = $.noop) {
			$.validate_snippet_args(...arguments);

			var button_1 = root_2();

			$.delegated('click', button_1, function (...$$args) {
				$.apply(reset, this, $$args, Main, [22, 19]);
			});

			$.append($$anchor, button_1);
		});

		$.boundary(node, { pending, failed }, ($$anchor) => {
			var p_1 = root_3();
			var text_1 = $.child(p_1, true);

			$.reset(p_1);

			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [
				async () => (await $.track_reactivity_loss(process($.get(count))))()
			]);

			$.append($$anchor, p_1);
		});
	}

	$.template_effect(() => $.set_text(text, `clicks: ${$.get(count) ?? ''}`));

	$.delegated('click', button, function click() {
		return $.update(count);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);