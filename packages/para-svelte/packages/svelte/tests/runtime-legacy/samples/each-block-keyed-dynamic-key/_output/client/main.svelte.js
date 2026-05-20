import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let id = $.prop($$props, 'id', 12, 0);
	let value = $.prop($$props, 'value', 12);

	var $$exports = {
		get id() {
			return id();
		},

		set id($$value) {
			id($$value);
			$.flush();
		},

		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 0, () => ['foo', 'bar'], (key) => id() + key, ($$anchor, key) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);

		$.template_effect(($0) => $.set_text(text, $0), [
			() => ($.deep_read_state(value()), $.untrack(() => value()()))
		]);

		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}