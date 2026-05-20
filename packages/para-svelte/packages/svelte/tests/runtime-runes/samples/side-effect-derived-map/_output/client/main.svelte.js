import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { SvelteMap } from 'svelte/reactivity';

var root = $.add_locations($.from_html(`<button>external</button> <!> <button>internal</button> <!> <button>external</button> <!> <button>internal</button> <!> <button>external</button> <!> <button>internal</button> <!> <button>external</button> <!> <button>internal</button> <!>`, 1), Main[$.FILENAME], [
	[67, 0],
	[71, 0],
	[76, 0],
	[80, 0],
	[85, 0],
	[89, 0],
	[94, 0],
	[98, 0]
]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let outside_basic = $.tag($.state(false), 'outside_basic');
	let outside_basic_map = new SvelteMap();

	const throw_basic = $.tag(
		$.derived(() => {
			outside_basic_map.set(1, 1);

			return outside_basic_map;
		}),
		'throw_basic'
	);

	let inside_basic = $.tag($.state(false), 'inside_basic');

	const works_basic = $.tag(
		$.derived(() => {
			let inside = new SvelteMap();

			inside.set(1, 1);

			return inside;
		}),
		'works_basic'
	);

	let outside_has = $.tag($.state(false), 'outside_has');
	let outside_has_map = new SvelteMap([[1, 1]]);

	const throw_has = $.tag(
		$.derived(() => {
			outside_has_map.has(1);
			outside_has_map.set(1, 2);

			return outside_has_map;
		}),
		'throw_has'
	);

	let inside_has = $.tag($.state(false), 'inside_has');

	const works_has = $.tag(
		$.derived(() => {
			let inside = new SvelteMap([[1, 1]]);

			inside.has(1);
			inside.set(1, 1);

			return inside;
		}),
		'works_has'
	);

	let outside_get = $.tag($.state(false), 'outside_get');
	let outside_get_map = new SvelteMap([[1, 1]]);

	const throw_get = $.tag(
		$.derived(() => {
			outside_get_map.get(1);
			outside_get_map.set(1, 2);

			return outside_get_map;
		}),
		'throw_get'
	);

	let inside_get = $.tag($.state(false), 'inside_get');

	const works_get = $.tag(
		$.derived(() => {
			let inside = new SvelteMap([[1, 1]]);

			inside.get(1);
			inside.set(1, 1);

			return inside;
		}),
		'works_get'
	);

	let outside_values = $.tag($.state(false), 'outside_values');
	let outside_values_map = new SvelteMap([[1, 1]]);

	const throw_values = $.tag(
		$.derived(() => {
			outside_values_map.values(1);
			outside_values_map.set(1, 2);

			return outside_values_map;
		}),
		'throw_values'
	);

	let inside_values = $.tag($.state(false), 'inside_values');

	const works_values = $.tag(
		$.derived(() => {
			let inside = new SvelteMap([[1, 1]]);

			inside.values();
			inside.set(1, 1);

			return inside;
		}),
		'works_values'
	);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var text = $.text();

			$.template_effect(() => $.set_text(text, $.get(throw_basic)));
			$.append($$anchor, text);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if ($.get(outside_basic)) $$render(consequent);
			}),
			'if',
			Main,
			68,
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
			72,
			0
		);
	}

	var button_2 = $.sibling(node_1, 2);
	var node_2 = $.sibling(button_2, 2);

	{
		var consequent_2 = ($$anchor) => {
			var text_2 = $.text();

			$.template_effect(() => $.set_text(text_2, $.get(throw_has)));
			$.append($$anchor, text_2);
		};

		$.add_svelte_meta(
			() => $.if(node_2, ($$render) => {
				if ($.get(outside_has)) $$render(consequent_2);
			}),
			'if',
			Main,
			77,
			0
		);
	}

	var button_3 = $.sibling(node_2, 2);
	var node_3 = $.sibling(button_3, 2);

	{
		var consequent_3 = ($$anchor) => {
			var text_3 = $.text();

			$.template_effect(() => $.set_text(text_3, $.get(works_has)));
			$.append($$anchor, text_3);
		};

		$.add_svelte_meta(
			() => $.if(node_3, ($$render) => {
				if ($.get(inside_has)) $$render(consequent_3);
			}),
			'if',
			Main,
			81,
			0
		);
	}

	var button_4 = $.sibling(node_3, 2);
	var node_4 = $.sibling(button_4, 2);

	{
		var consequent_4 = ($$anchor) => {
			var text_4 = $.text();

			$.template_effect(() => $.set_text(text_4, $.get(throw_get)));
			$.append($$anchor, text_4);
		};

		$.add_svelte_meta(
			() => $.if(node_4, ($$render) => {
				if ($.get(outside_get)) $$render(consequent_4);
			}),
			'if',
			Main,
			86,
			0
		);
	}

	var button_5 = $.sibling(node_4, 2);
	var node_5 = $.sibling(button_5, 2);

	{
		var consequent_5 = ($$anchor) => {
			var text_5 = $.text();

			$.template_effect(() => $.set_text(text_5, $.get(works_get)));
			$.append($$anchor, text_5);
		};

		$.add_svelte_meta(
			() => $.if(node_5, ($$render) => {
				if ($.get(inside_get)) $$render(consequent_5);
			}),
			'if',
			Main,
			90,
			0
		);
	}

	var button_6 = $.sibling(node_5, 2);
	var node_6 = $.sibling(button_6, 2);

	{
		var consequent_6 = ($$anchor) => {
			var text_6 = $.text();

			$.template_effect(() => $.set_text(text_6, $.get(throw_values)));
			$.append($$anchor, text_6);
		};

		$.add_svelte_meta(
			() => $.if(node_6, ($$render) => {
				if ($.get(outside_values)) $$render(consequent_6);
			}),
			'if',
			Main,
			95,
			0
		);
	}

	var button_7 = $.sibling(node_6, 2);
	var node_7 = $.sibling(button_7, 2);

	{
		var consequent_7 = ($$anchor) => {
			var text_7 = $.text();

			$.template_effect(() => $.set_text(text_7, $.get(works_values)));
			$.append($$anchor, text_7);
		};

		$.add_svelte_meta(
			() => $.if(node_7, ($$render) => {
				if ($.get(inside_values)) $$render(consequent_7);
			}),
			'if',
			Main,
			99,
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
		return $.set(outside_has, true);
	});

	$.delegated('click', button_3, function click_3() {
		return $.set(inside_has, true);
	});

	$.delegated('click', button_4, function click_4() {
		return $.set(outside_get, true);
	});

	$.delegated('click', button_5, function click_5() {
		return $.set(inside_get, true);
	});

	$.delegated('click', button_6, function click_6() {
		return $.set(outside_values, true);
	});

	$.delegated('click', button_7, function click_7() {
		return $.set(inside_values, true);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);