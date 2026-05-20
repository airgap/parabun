import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12, 0);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.key(node, value, ($$anchor) => {
		var div = root_1();

		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}