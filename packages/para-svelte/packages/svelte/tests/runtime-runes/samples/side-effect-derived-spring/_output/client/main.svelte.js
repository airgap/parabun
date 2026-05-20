import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { Spring } from 'svelte/motion';

var root = $.add_locations($.from_html(`<button>external</button> <!> <button>internal</button> <!>`, 1), Main[$.FILENAME], [[19, 0], [23, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let outside_basic = $.tag($.state(false), 'outside_basic');
	let outside_basic_spring = new Spring(0);

	const throws_basic = $.tag(
		$.derived(() => {
			outside_basic_spring.set(1);

			return outside_basic_spring;
		}),
		'throws_basic'
	);

	let inside_basic = $.tag($.state(false), 'inside_basic');

	const works_basic = $.tag(
		$.derived(() => {
			let internal = new Spring(0);

			internal.set(1);

			return internal;
		}),
		'works_basic'
	);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var text = $.text();

			$.template_effect(() => $.set_text(text, $.get(throws_basic)));
			$.append($$anchor, text);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if ($.get(outside_basic)) $$render(consequent);
			}),
			'if',
			Main,
			20,
			0
		);
	}

	var button_1 = $.sibling(node, 2);
	var node_1 = $.sibling(button_1, 2);

	{
		var consequent_1 = ($$anchor) => {
			var text_1 = $.text();

			$.template_effect(() => $.set_text(text_1, $.get(works_basic)));
			$.append($$anchor, text_1);
		};

		$.add_svelte_meta(
			() => $.if(node_1, ($$render) => {
				if ($.get(inside_basic)) $$render(consequent_1);
			}),
			'if',
			Main,
			24,
			0
		);
	}

	$.delegated('click', button, function click() {
		return $.set(outside_basic, true);
	});

	$.delegated('click', button_1, function click_1() {
		return $.set(inside_basic, true);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);