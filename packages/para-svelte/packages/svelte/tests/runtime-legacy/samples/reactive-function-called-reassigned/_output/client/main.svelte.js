import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const refs = $.mutable_source(['1', '2', '3']);
	let callback = $.prop($$props, 'callback', 12, () => {});

	$.legacy_pre_effect(() => ($.deep_read_state(callback()), $.get(refs)), () => {
		callback()($.get(refs));
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get callback() {
			return callback();
		},

		set callback($$value) {
			callback($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(refs), $.index, ($$anchor, ref, $$index) => {
		var input = root_1();

		$.remove_input_defaults(input);

		$.bind_value(input, () => $.get(refs)[$$index], ($$value) => (
			$.get(refs)[$$index] = $$value,
			$.invalidate_inner_signals(() => ($.get(refs)))
		));

		$.append($$anchor, input);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}