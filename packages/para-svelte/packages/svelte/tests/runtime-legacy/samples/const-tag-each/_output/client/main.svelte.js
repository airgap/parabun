import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let boxes = $.prop($$props, 'boxes', 28, () => [
		{ width: 3, height: 4 },
		{ width: 5, height: 7 },
		{ width: 6, height: 8 }
	]);

	let constant = $.prop($$props, 'constant', 12, 10);

	function calculate(width, height, constant) {
		return { area: width * height, volume: width * height * constant };
	}

	var $$exports = {
		get boxes() {
			return boxes();
		},

		set boxes($$value) {
			boxes($$value);
			$.flush();
		},

		get constant() {
			return constant();
		},

		set constant($$value) {
			constant($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, boxes, $.index, ($$anchor, box) => {
		const computed_const = $.derived_safe_equal(() => {
			const { area, volume } = (
				$.get(box),
				$.deep_read_state(constant()),
				$.untrack(() => calculate($.get(box).width, $.get(box).height, constant()))
			);

			return { area, volume };
		});

		const perimeter = $.derived_safe_equal(() => (
			$.get(box),
			$.deep_read_state(constant()),
			$.untrack(() => ($.get(box).width + $.get(box).height) * constant())
		));

		const computed_const_1 = $.derived_safe_equal(() => {
			const [width, height, sum] = (
				$.get(box),
				$.deep_read_state(constant()),
				$.untrack(() => [
					$.get(box).width * constant(),
					$.get(box).height,
					$.get(box).width * constant() + $.get(box).height
				])
			);

			return { width, height, sum };
		});

		var div = root_1();
		var text = $.child(div);

		$.reset(div);
		$.template_effect(() => $.set_text(text, `${$.get(computed_const).area ?? ''} ${$.get(computed_const).volume ?? ''} ${$.get(perimeter) ?? ''}, ${$.get(computed_const_1).width ?? ''}+${$.get(computed_const_1).height ?? ''}=${$.get(computed_const_1).sum ?? ''}`));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}