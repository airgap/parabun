import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button>external</button> <!> <button>internal</button> <!>`, 1), Main[$.FILENAME], [[17, 0], [21, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let visibleExternal = $.tag($.state(false), 'visibleExternal');
	let external = $.tag_proxy($.proxy({ v: 1 }), 'external');

	const throws = $.tag(
		$.derived(() => {
			external.v = 2;

			return external;
		}),
		'throws'
	);

	let visibleInternal = $.tag($.state(false), 'visibleInternal');

	const works = $.tag(
		$.derived(() => {
			let internal = $.tag_proxy($.proxy({ v: 1 }), 'internal');

			internal.v = 2;

			return internal;
		}),
		'works'
	);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var text = $.text();

			$.template_effect(() => $.set_text(text, $.get(throws)));
			$.append($$anchor, text);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if ($.get(visibleExternal)) $$render(consequent);
			}),
			'if',
			Main,
			18,
			0
		);
	}

	var button_1 = $.sibling(node, 2);
	var node_1 = $.sibling(button_1, 2);

	{
		var consequent_1 = ($$anchor) => {
			var text_1 = $.text();

			$.template_effect(() => $.set_text(text_1, $.get(works)));
			$.append($$anchor, text_1);
		};

		$.add_svelte_meta(
			() => $.if(node_1, ($$render) => {
				if ($.get(visibleInternal)) $$render(consequent_1);
			}),
			'if',
			Main,
			22,
			0
		);
	}

	$.delegated('click', button, function click() {
		return $.set(visibleExternal, true);
	});

	$.delegated('click', button_1, function click_1() {
		return $.set(visibleInternal, true);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);