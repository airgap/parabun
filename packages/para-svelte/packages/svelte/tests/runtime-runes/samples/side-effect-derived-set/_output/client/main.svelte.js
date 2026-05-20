import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { SvelteSet } from 'svelte/reactivity';

var root = $.add_locations($.from_html(`<button>external</button> <!> <button>internal</button> <!> <button>external</button> <!> <button>internal</button> <!>`, 1), Main[$.FILENAME], [[35, 0], [39, 0], [44, 0], [48, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let outside_basic = $.tag($.state(false), 'outside_basic');
	let outside_basic_set = new SvelteSet();

	const throws_basic = $.tag(
		$.derived(() => {
			outside_basic_set.add(1);

			return outside_basic_set;
		}),
		'throws_basic'
	);

	let inside_basic = $.tag($.state(false), 'inside_basic');

	const works_basic = $.tag(
		$.derived(() => {
			let internal = new SvelteSet();

			internal.add(1);

			return internal;
		}),
		'works_basic'
	);

	let outside_has_delete = $.tag($.state(false), 'outside_has_delete');
	let outside_has_delete_set = new SvelteSet([1]);

	const throws_has_delete = $.tag(
		$.derived(() => {
			outside_has_delete_set.has(1);
			outside_has_delete_set.delete(1);

			return outside_has_delete_set;
		}),
		'throws_has_delete'
	);

	let inside_has_delete = $.tag($.state(false), 'inside_has_delete');

	const works_has_delete = $.tag(
		$.derived(() => {
			let internal = new SvelteSet([1]);

			internal.has(1);
			internal.delete(1);

			return internal;
		}),
		'works_has_delete'
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
			36,
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
			40,
			0
		);
	}

	var button_2 = $.sibling(node_1, 2);
	var node_2 = $.sibling(button_2, 2);

	{
		var consequent_2 = ($$anchor) => {
			var text_2 = $.text();

			$.template_effect(() => $.set_text(text_2, $.get(throws_has_delete)));
			$.append($$anchor, text_2);
		};

		$.add_svelte_meta(
			() => $.if(node_2, ($$render) => {
				if ($.get(outside_has_delete)) $$render(consequent_2);
			}),
			'if',
			Main,
			45,
			0
		);
	}

	var button_3 = $.sibling(node_2, 2);
	var node_3 = $.sibling(button_3, 2);

	{
		var consequent_3 = ($$anchor) => {
			var text_3 = $.text();

			$.template_effect(() => $.set_text(text_3, $.get(works_has_delete)));
			$.append($$anchor, text_3);
		};

		$.add_svelte_meta(
			() => $.if(node_3, ($$render) => {
				if ($.get(inside_has_delete)) $$render(consequent_3);
			}),
			'if',
			Main,
			49,
			0
		);
	}

	$.delegated('click', button, function click() {
		return $.set(outside_basic, true);
	});

	$.delegated('click', button_1, function click_1() {
		return $.set(inside_basic, true);
	});

	$.delegated('click', button_2, function click_2() {
		return $.set(outside_has_delete, true);
	});

	$.delegated('click', button_3, function click_3() {
		return $.set(inside_has_delete, true);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);