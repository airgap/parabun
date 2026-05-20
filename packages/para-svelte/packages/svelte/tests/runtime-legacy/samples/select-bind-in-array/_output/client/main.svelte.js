import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<select><option>a</option><option>b</option></select>`);

export default function Main($$anchor, $$props) {
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

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, items, $.index, ($$anchor, item, $$index) => {
		var select = root_1();
		var option = $.child(select);

		option.value = option.__value = 'a';

		var option_1 = $.sibling(option);

		option_1.value = option_1.__value = 'b';
		$.reset(select);

		$.bind_select_value(select, () => $.get(item).id, ($$value) => (
			$.get(item).id = $$value,
			$.invalidate_inner_signals(() => (items()))
		));

		$.append($$anchor, select);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}