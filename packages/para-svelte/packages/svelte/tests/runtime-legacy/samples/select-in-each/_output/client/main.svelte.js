import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<select><option>A</option><option>B</option></select> `, 1);

export default function Main($$anchor) {
	let entries = $.mutable_source([{ selected: 'a' }]);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(entries), $.index, ($$anchor, entry, $$index) => {
		var fragment_1 = root_1();
		var select = $.first_child(fragment_1);
		var option = $.child(select);

		option.value = option.__value = 'a';

		var option_1 = $.sibling(option);

		option_1.value = option_1.__value = 'b';
		$.reset(select);

		var text = $.sibling(select);

		$.template_effect(() => $.set_text(text, ` selected: ${($.get(entry), $.untrack(() => $.get(entry).selected)) ?? ''}`));

		$.bind_select_value(select, () => $.get(entry).selected, ($$value) => (
			$.get(entry).selected = $$value,
			$.invalidate_inner_signals(() => ($.get(entries)))
		));

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
}