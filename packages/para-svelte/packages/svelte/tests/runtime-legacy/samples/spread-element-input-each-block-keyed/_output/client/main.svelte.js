import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 28, () => ['value1', 'value2']);

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, items, (item) => item, ($$anchor, item) => {
		var input = root_1();

		$.attribute_effect(input, () => ({ value: $.get(item), ...{} }), void 0, void 0, void 0, void 0, true);
		$.append($$anchor, input);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}