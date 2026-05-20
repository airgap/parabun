import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const items = $.mutable_source();

	function fn(value) {
		return true;
	}

	$.legacy_pre_effect(() => {}, () => {
		$.set(items, [{ value: 'hello' }]);
	});

	$.legacy_pre_effect_reset();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => ($.get(items), $.untrack(() => $.get(items).filter(fn))), $.index, ($$anchor, item, $$index) => {
		var input = root_1();

		$.remove_input_defaults(input);

		$.bind_value(input, () => $.get(item).value, ($$value) => (
			$.get(item).value = $$value,
			$.invalidate_inner_signals(() => ($.get(items)))
		));

		$.append($$anchor, input);
	});

	$.append($$anchor, fragment);
	$.pop();
}