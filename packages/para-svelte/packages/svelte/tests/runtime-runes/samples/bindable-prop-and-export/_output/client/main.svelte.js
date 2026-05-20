import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Component from "./Component.svelte";

var root = $.add_locations($.from_html(`<!> <button> </button> <input type="checkbox"/>`, 1), Main[$.FILENAME], [[10, 0], [14, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let open = $.tag($.state(true), 'open');
	let comp;
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => $.bind_this(
			Component(node, {
				get open() {
					return $.get(open);
				},

				set open($$value) {
					$.set(open, $$value, true);
				}
			}),
			($$value) => comp = $$value,
			() => comp
		),
		'component',
		Main,
		8,
		0,
		{ componentTag: 'Component' }
	);

	var button = $.sibling(node, 2);
	var text = $.child(button, true);

	$.reset(button);

	var input = $.sibling(button, 2);

	$.remove_input_defaults(input);
	$.template_effect(() => $.set_text(text, $.get(open)));

	$.delegated('click', button, function click() {
		comp.open();
	});

	$.bind_checked(
		input,
		function get() {
			return $.get(open);
		},
		function set($$value) {
			$.set(open, $$value);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);