import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12, 0);
	let anotherValue = $.prop($$props, 'anotherValue', 12, 0);
	let thirdValue = $.prop($$props, 'thirdValue', 12, 0);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get anotherValue() {
			return anotherValue();
		},

		set anotherValue($$value) {
			anotherValue($$value);
			$.flush();
		},

		get thirdValue() {
			return thirdValue();
		},

		set thirdValue($$value) {
			thirdValue($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.key(node, () => value() + anotherValue(), ($$anchor) => {
		var div = root_1();
		var text = $.child(div);

		$.reset(div);
		$.template_effect(() => $.set_text(text, `${value() ?? ''}${anotherValue() ?? ''}${thirdValue() ?? ''}`));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}