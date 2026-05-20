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
		return {
			'the-area': width * height,
			'the-volume': width * height * constant
		};
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

	$.each(node, 1, boxes, $.index, ($$anchor, $$item) => {
		let width = () => $.get($$item).width;
		let height = () => $.get($$item).height;

		const computed_const = $.derived_safe_equal(() => {
			const { 'the-area': area, 'the-volume': volume } = (
				width(),
				height(),
				$.deep_read_state(constant()),
				$.untrack(() => calculate(width(), height(), constant()))
			);

			return { area, volume };
		});

		const perimeter = $.derived_safe_equal(() => (width() + height()) * constant());

		const computed_const_1 = $.derived_safe_equal(() => {
			const { 2: sum, 0: _width, 1: _height } = [
				width() * constant(),
				height(),
				width() * constant() + height()
			];

			return { sum, _width, _height };
		});

		var div = root_1();
		var text = $.child(div);

		$.reset(div);
		$.template_effect(() => $.set_text(text, `${$.get(computed_const).area ?? ''} ${$.get(computed_const).volume ?? ''} ${$.get(perimeter) ?? ''}, ${$.get(computed_const_1)._width ?? ''}+${$.get(computed_const_1)._height ?? ''}=${$.get(computed_const_1).sum ?? ''}`));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}