import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);
var root_2 = $.from_html(`<div> </div>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let promise1 = $.prop($$props, 'promise1', 28, () => ({ width: 3, height: 4 }));
	let promise2 = $.prop($$props, 'promise2', 28, () => ({ width: 5, height: 7 }));
	let constant = $.prop($$props, 'constant', 12, 10);

	function calculate(width, height, constant) {
		return { area: width * height, volume: width * height * constant };
	}

	var $$exports = {
		get promise1() {
			return promise1();
		},

		set promise1($$value) {
			promise1($$value);
			$.flush();
		},

		get promise2() {
			return promise2();
		},

		set promise2($$value) {
			promise2($$value);
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

	$.await(node, promise1, null, ($$anchor, box) => {
		const computed_const = $.derived_safe_equal(() => {
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

		const computed_const_1 = $.derived_safe_equal(() => {
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

		var div = root_1();
		var text = $.child(div);

		$.reset(div);
		$.template_effect(() => $.set_text(text, `${$.get(computed_const).area ?? ''} ${$.get(computed_const).volume ?? ''} ${$.get(perimeter) ?? ''}, ${$.get(computed_const_1).width ?? ''}+${$.get(computed_const_1).height ?? ''}=${$.get(computed_const_1).sum ?? ''}`));
		$.append($$anchor, div);
	});

	var node_1 = $.sibling(node, 2);

	$.await(node_1, promise2, null, void 0, ($$anchor, box) => {
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

		var div_1 = root_2();
		var text_1 = $.child(div_1);

		$.reset(div_1);
		$.template_effect(() => $.set_text(text_1, `${$.get(computed_const_2).area ?? ''} ${$.get(computed_const_2).volume ?? ''} ${$.get(perimeter) ?? ''}, ${$.get(computed_const_3).width ?? ''}+${$.get(computed_const_3).height ?? ''}=${$.get(computed_const_3).sum ?? ''}`));
		$.append($$anchor, div_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}