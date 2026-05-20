import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { fork } from 'svelte';

var root_1 = $.add_locations($.from_html(`<button><!></button>`), Main[$.FILENAME], [[23, 1]]);
var root = $.add_locations($.from_html(`<button>fork</button> <!>`, 1), Main[$.FILENAME], [[10, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let condition = $.tag($.state(false), 'condition');
	let checked = $.tag($.state(false), 'checked');
	const d = $.tag($.derived(() => ({ checked: $.get(checked) })), 'd');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			const foo = $.wrap_snippet(Main, function ($$anchor, $$arg0) {
				$.validate_snippet_args(...arguments);

				let checked = () => $$arg0?.().checked;

				checked();
				$.next();

				var text = $.text();

				$.template_effect(() => $.set_text(text, checked()));
				$.append($$anchor, text);
			});

			var button_1 = root_1();
			var node_1 = $.child(button_1);

			$.add_svelte_meta(() => foo(node_1, () => $.get(d)), 'render', Main, 24, 2);
			$.reset(button_1);

			$.delegated('click', button_1, function click_1() {
				return $.set(checked, !$.get(checked));
			});

			$.append($$anchor, button_1);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if ($.get(condition)) $$render(consequent);
			}),
			'if',
			Main,
			16,
			0
		);
	}

	$.delegated('click', button, function click() {
		fork(() => {
			$.set(condition, true);
		}).commit();
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);