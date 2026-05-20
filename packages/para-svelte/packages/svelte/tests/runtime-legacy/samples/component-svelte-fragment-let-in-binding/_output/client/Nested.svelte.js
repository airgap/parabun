import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 12);

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	var div = root();

	$.each(div, 5, items, $.index, ($$anchor, item, index) => {
		var fragment = $.comment();
		var node = $.first_child(fragment);

		$.slot(node, $$props, 'main', { index }, null);
		$.append($$anchor, fragment);
	});

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}