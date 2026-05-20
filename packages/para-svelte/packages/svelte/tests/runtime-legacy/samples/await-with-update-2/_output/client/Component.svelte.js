import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div> <div> </div>`, 1);

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12);
	let value = $.prop($$props, 'value', 12);

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
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

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div);

	$.reset(div);

	var div_1 = $.sibling(div, 2);
	var text_1 = $.child(div_1);

	$.reset(div_1);

	$.template_effect(() => {
		$.set_text(text, `count: ${count() ?? ''}`);
		$.set_text(text_1, `value: ${value() ?? ''}`);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}