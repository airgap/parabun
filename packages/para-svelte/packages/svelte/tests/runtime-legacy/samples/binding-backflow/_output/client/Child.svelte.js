import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div>`);

export default function Child($$anchor, $$props) {
	$.push($$props, false);

	let testcase = $.prop($$props, 'testcase', 12);
	let value = $.prop($$props, 'value', 28, () => ({ foo: 'kid' }));

	if (testcase() === 'init_update') {
		value({ foo: 'kid' });
	}

	if (testcase() === 'init_mutate') {
		value(value().foo = 'kid', true);
	}

	let updates = $.prop($$props, 'updates', 28, () => []);

	$.legacy_pre_effect(() => ($.deep_read_state(testcase())), () => {
		if (testcase() === 'reactive_update') {
			value({ foo: 'kid' });
		}
	});

	$.legacy_pre_effect(() => ($.deep_read_state(testcase())), () => {
		if (testcase() === 'reactive_mutate') {
			value(value().foo = 'kid', true);
		}
	});

	$.legacy_pre_effect(() => ($.deep_read_state(updates()), $.deep_read_state(value())), () => {
		updates([...updates(), value()]);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
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

	var div = root();
	var text = $.child(div);

	$.reset(div);

	$.template_effect(() => $.set_text(text, `child: ${($.deep_read_state(value()), $.untrack(() => value()?.foo)) ?? ''} | updates: ${(
		$.deep_read_state(updates()),
		$.untrack(() => updates().length)
	) ?? ''}`));

	$.append($$anchor, div);

	return $.pop($$exports);
}