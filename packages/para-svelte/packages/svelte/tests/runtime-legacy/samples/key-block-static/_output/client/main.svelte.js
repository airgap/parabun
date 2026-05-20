import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = 0;
	let anotherValue = $.prop($$props, 'anotherValue', 12, 0);

	var $$exports = {
		get anotherValue() {
			return anotherValue();
		},

		set anotherValue($$value) {
			anotherValue($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.key(node, () => value, ($$anchor) => {
		var div = root_1();
		var text = $.child(div);

		$.reset(div);
		$.template_effect(() => $.set_text(text, `0${anotherValue() ?? ''}`));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}