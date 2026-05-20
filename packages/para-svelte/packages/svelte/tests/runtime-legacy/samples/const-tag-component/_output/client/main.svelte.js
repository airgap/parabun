import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root_2 = $.from_html(`<div> </div>`);
var root_4 = $.from_html(`<div> </div>`);
var root_6 = $.from_html(`<div> </div>`);
var root_7 = $.from_html(`<div> </div>`);
var root_8 = $.from_html(`<div slot="box1"><div> </div></div>`);
var root_9 = $.from_html(`<div slot="box2"><div> </div></div>`);
var root_10 = $.from_html(`<div> </div>`);
var root = $.from_html(`<!> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let box = $.prop($$props, 'box', 28, () => ({ width: 3, height: 4 }));
	let constant = $.prop($$props, 'constant', 12, 10);

	function calculate(width, height, constant) {
		return { area: width * height, volume: width * height * constant };
	}

	var $$exports = {
		get box() {
			return box();
		},

		set box($$value) {
			box($$value);
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

	var fragment = root();
	var node = $.first_child(fragment);

	Component(node, {
		get box() {
			return box();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const box_1 = $.derived(() => {
					let { width, height } = $$slotProps.box;

					return { width, height };
				});

				const computed_const = $.derived_safe_equal(() => {
					const { area, volume } = (
						$.deep_read_state($.get(box_1).width),
						$.deep_read_state($.get(box_1).height),
						$.deep_read_state(constant()),
						$.untrack(() => calculate($.get(box_1).width, $.get(box_1).height, constant()))
					);

					return { area, volume };
				});

				const perimeter = $.derived_safe_equal(() => ($.get(box_1).width + $.get(box_1).height) * constant());

				const computed_const_1 = $.derived_safe_equal(() => {
					const [_width, _height, sum] = [
						$.get(box_1).width * constant(),
						$.get(box_1).height,
						$.get(box_1).width * constant() + $.get(box_1).height
					];

					return { _width, _height, sum };
				});

				var div = root_2();
				var text = $.child(div);

				$.reset(div);
				$.template_effect(() => $.set_text(text, `${$.get(computed_const).area ?? ''} ${$.get(computed_const).volume ?? ''} ${$.get(perimeter) ?? ''}, ${$.get(computed_const_1)._width ?? ''}+${$.get(computed_const_1)._height ?? ''}=${$.get(computed_const_1).sum ?? ''}`));
				$.append($$anchor, div);
			},

			box1: ($$anchor, $$slotProps) => {
				const box = $.derived_safe_equal(() => $$slotProps.box);

				const computed_const_2 = $.derived_safe_equal(() => {
					const { area, volume } = (
						$.deep_read_state($.get(box)),
						$.deep_read_state(constant()),
						$.untrack(() => calculate($.get(box).width, $.get(box).height, constant()))
					);

					return { area, volume };
				});

				const perimeter = $.derived_safe_equal(() => (
					$.deep_read_state($.get(box)),
					$.deep_read_state(constant()),
					$.untrack(() => ($.get(box).width + $.get(box).height) * constant())
				));

				const computed_const_3 = $.derived_safe_equal(() => {
					const [width, height, sum] = (
						$.deep_read_state($.get(box)),
						$.deep_read_state(constant()),
						$.untrack(() => [
							$.get(box).width * constant(),
							$.get(box).height,
							$.get(box).width * constant() + $.get(box).height
						])
					);

					return { width, height, sum };
				});

				var div_1 = root_4();
				var text_1 = $.child(div_1);

				$.reset(div_1);
				$.template_effect(() => $.set_text(text_1, `${$.get(computed_const_2).area ?? ''} ${$.get(computed_const_2).volume ?? ''} ${$.get(perimeter) ?? ''}, ${$.get(computed_const_3).width ?? ''}+${$.get(computed_const_3).height ?? ''}=${$.get(computed_const_3).sum ?? ''}`));
				$.append($$anchor, div_1);
			},

			box2: ($$anchor, $$slotProps) => {
				const width = $.derived_safe_equal(() => $$slotProps.width);
				const height = $.derived_safe_equal(() => $$slotProps.height);

				const computed_const_4 = $.derived_safe_equal(() => {
					const { area, volume } = (
						$.deep_read_state($.get(width)),
						$.deep_read_state($.get(height)),
						$.deep_read_state(constant()),
						$.untrack(() => calculate($.get(width), $.get(height), constant()))
					);

					return { area, volume };
				});

				const perimeter = $.derived_safe_equal(() => ($.get(width) + $.get(height)) * constant());

				const computed_const_5 = $.derived_safe_equal(() => {
					const [_width, _height, sum] = [
						$.get(width) * constant(),
						$.get(height),
						$.get(width) * constant() + $.get(height)
					];

					return { _width, _height, sum };
				});

				var div_2 = root_6();
				var text_2 = $.child(div_2);

				$.reset(div_2);
				$.template_effect(() => $.set_text(text_2, `${$.get(computed_const_4).area ?? ''} ${$.get(computed_const_4).volume ?? ''} ${$.get(perimeter) ?? ''}, ${$.get(computed_const_5)._width ?? ''}+${$.get(computed_const_5)._height ?? ''}=${$.get(computed_const_5).sum ?? ''}`));
				$.append($$anchor, div_2);
			}
		}
	});

	var node_1 = $.sibling(node, 2);

	Component(node_1, {
		get box() {
			return box();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const box = $.derived_safe_equal(() => $$slotProps.box);

				const computed_const_6 = $.derived_safe_equal(() => {
					const { area, volume } = (
						$.deep_read_state($.get(box)),
						$.deep_read_state(constant()),
						$.untrack(() => calculate($.get(box).width, $.get(box).height, constant()))
					);

					return { area, volume };
				});

				const perimeter = $.derived_safe_equal(() => (
					$.deep_read_state($.get(box)),
					$.deep_read_state(constant()),
					$.untrack(() => ($.get(box).width + $.get(box).height) * constant())
				));

				const computed_const_7 = $.derived_safe_equal(() => {
					const [width, height, sum] = (
						$.deep_read_state($.get(box)),
						$.deep_read_state(constant()),
						$.untrack(() => [
							$.get(box).width * constant(),
							$.get(box).height,
							$.get(box).width * constant() + $.get(box).height
						])
					);

					return { width, height, sum };
				});

				var div_3 = root_7();
				var text_3 = $.child(div_3);

				$.reset(div_3);
				$.template_effect(() => $.set_text(text_3, `${$.get(computed_const_6).area ?? ''} ${$.get(computed_const_6).volume ?? ''} ${$.get(perimeter) ?? ''}, ${$.get(computed_const_7).width ?? ''}+${$.get(computed_const_7).height ?? ''}=${$.get(computed_const_7).sum ?? ''}`));
				$.append($$anchor, div_3);
			},

			box1: ($$anchor, $$slotProps) => {
				const computed_const_8 = $.derived_safe_equal(() => {
					const { area, volume } = (
						$.deep_read_state($.get(box)),
						$.deep_read_state(constant()),
						$.untrack(() => calculate($.get(box).width, $.get(box).height, constant()))
					);

					return { area, volume };
				});

				const perimeter = $.derived_safe_equal(() => (
					$.deep_read_state($.get(box)),
					$.deep_read_state(constant()),
					$.untrack(() => ($.get(box).width + $.get(box).height) * constant())
				));

				const computed_const_9 = $.derived_safe_equal(() => {
					const [width, height, sum] = (
						$.deep_read_state($.get(box)),
						$.deep_read_state(constant()),
						$.untrack(() => [
							$.get(box).width * constant(),
							$.get(box).height,
							$.get(box).width * constant() + $.get(box).height
						])
					);

					return { width, height, sum };
				});

				var div_4 = root_8();
				const box = $.derived_safe_equal(() => $$slotProps.box);
				var div_5 = $.child(div_4);
				var text_4 = $.child(div_5);

				$.reset(div_5);
				$.reset(div_4);
				$.template_effect(() => $.set_text(text_4, `${$.get(computed_const_8).area ?? ''} ${$.get(computed_const_8).volume ?? ''} ${$.get(perimeter) ?? ''}, ${$.get(computed_const_9).width ?? ''}+${$.get(computed_const_9).height ?? ''}=${$.get(computed_const_9).sum ?? ''}`));
				$.append($$anchor, div_4);
			},

			box2: ($$anchor, $$slotProps) => {
				const computed_const_10 = $.derived_safe_equal(() => {
					const { area, volume } = (
						$.deep_read_state($.get(width)),
						$.deep_read_state($.get(height)),
						$.deep_read_state(constant()),
						$.untrack(() => calculate($.get(width), $.get(height), constant()))
					);

					return { area, volume };
				});

				const perimeter = $.derived_safe_equal(() => ($.get(width) + $.get(height)) * constant());

				const computed_const_11 = $.derived_safe_equal(() => {
					const [_width, _height, sum] = [
						$.get(width) * constant(),
						$.get(height),
						$.get(width) * constant() + $.get(height)
					];

					return { _width, _height, sum };
				});

				var div_6 = root_9();
				const width = $.derived_safe_equal(() => $$slotProps.width);
				const height = $.derived_safe_equal(() => $$slotProps.height);
				var div_7 = $.child(div_6);
				var text_5 = $.child(div_7);

				$.reset(div_7);
				$.reset(div_6);
				$.template_effect(() => $.set_text(text_5, `${$.get(computed_const_10).area ?? ''} ${$.get(computed_const_10).volume ?? ''} ${$.get(perimeter) ?? ''}, ${$.get(computed_const_11)._width ?? ''}+${$.get(computed_const_11)._height ?? ''}=${$.get(computed_const_11).sum ?? ''}`));
				$.append($$anchor, div_6);
			}
		}
	});

	var node_2 = $.sibling(node_1, 2);

	Component(node_2, {
		get box() {
			return box();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const box_2 = $.derived(() => {
					let { width, height } = $$slotProps.box;

					return { width, height };
				});

				const computed_const_12 = $.derived_safe_equal(() => {
					const { area, volume } = (
						$.deep_read_state($.get(box_2).width),
						$.deep_read_state($.get(box_2).height),
						$.deep_read_state(constant()),
						$.untrack(() => calculate($.get(box_2).width, $.get(box_2).height, constant()))
					);

					return { area, volume };
				});

				const perimeter = $.derived_safe_equal(() => ($.get(box_2).width + $.get(box_2).height) * constant());

				const computed_const_13 = $.derived_safe_equal(() => {
					const [_width, _height, sum] = [
						$.get(box_2).width * constant(),
						$.get(box_2).height,
						$.get(box_2).width * constant() + $.get(box_2).height
					];

					return { _width, _height, sum };
				});

				var div_8 = root_10();
				var text_6 = $.child(div_8);

				$.reset(div_8);
				$.template_effect(() => $.set_text(text_6, `${$.get(computed_const_12).area ?? ''} ${$.get(computed_const_12).volume ?? ''} ${$.get(perimeter) ?? ''}, ${$.get(computed_const_13)._width ?? ''}+${$.get(computed_const_13)._height ?? ''}=${$.get(computed_const_13).sum ?? ''}`));
				$.append($$anchor, div_8);
			}
		}
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}