import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let array = $.prop($$props, 'array', 28, () => [{ value: '' }, {}]);

	var $$exports = {
		get array() {
			return array();
		},

		set array($$value) {
			array($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, array, $.index, ($$anchor, $$item) => {
		let value = $.derived_safe_equal(() => $.fallback($.get($$item).value, "hello"));
		var input = root_1();

		$.remove_input_defaults(input);

		$.bind_value(input, () => $.get(value), ($$value) => (
			$.get($$item).value = $$value,
			$.invalidate_inner_signals(() => (array()))
		));

		$.append($$anchor, input);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}