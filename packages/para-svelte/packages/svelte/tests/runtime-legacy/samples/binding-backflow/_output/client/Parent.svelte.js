import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root = $.from_html(`<div> </div> <!>`, 1);

export default function Parent($$anchor, $$props) {
	$.push($$props, false);

	let child = $.prop($$props, 'child', 12);
	let testcase = $.prop($$props, 'testcase', 12);
	let value = $.prop($$props, 'value', 12);
	let updates = $.prop($$props, 'updates', 28, () => []);

	$.legacy_pre_effect(() => ($.deep_read_state(updates()), $.deep_read_state(value())), () => {
		updates([...updates(), value()]);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get child() {
			return child();
		},

		set child($$value) {
			child($$value);
			$.flush();
		},

		get testcase() {
			return testcase();
		},

		set testcase($$value) {
			testcase($$value);
			$.flush();
		},

		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get updates() {
			return updates();
		},

		set updates($$value) {
			updates($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div);

	$.reset(div);

	var node = $.sibling(div, 2);

	$.bind_this(
		Child(node, {
			get testcase() {
				return testcase();
			},

			get value() {
				return value();
			},

			set value($$value) {
				value($$value);
			},
			$$legacy: true
		}),
		($$value) => child($$value),
		() => child()
	);

	$.template_effect(() => $.set_text(text, `parent: ${($.deep_read_state(value()), $.untrack(() => value()?.foo)) ?? ''} | updates: ${(
		$.deep_read_state(updates()),
		$.untrack(() => updates().length)
	) ?? ''}`));

	$.append($$anchor, fragment);

	return $.pop($$exports);
}