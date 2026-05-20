import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p> </p>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let promise1 = $.prop($$props, 'promise1', 28, () => ({ length: 5, width: 3, height: 4 }));
	let promise2 = $.prop($$props, 'promise2', 28, () => ({ length: 12, width: 5, height: 13 }));
	let permutation = $.prop($$props, 'permutation', 28, () => [1, 2, 3]);

	function calculate(length, width, height) {
		return {
			'1-Dimensions': [length, width, height],
			'2-Dimensions': [length * width, width * height, length * height],
			'3-Dimensions': [
				length * width * height,
				length + width + height,
				length * width + width * height + length * height
			]
		};
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

		get permutation() {
			return permutation();
		},

		set permutation($$value) {
			permutation($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.await(node, promise1, null, ($$anchor, $$source) => {
		var $$value = $.derived_safe_equal(() => {
			var { length, width, height } = $.get($$source);

			return { length, width, height };
		});

		var length = $.derived_safe_equal(() => $.get($$value).length);
		var width = $.derived_safe_equal(() => $.get($$value).width);
		var height = $.derived_safe_equal(() => $.get($$value).height);

		const computed_const = $.derived_safe_equal(() => {
			const [a, b, c] = permutation();

			return { a, b, c };
		});

		const computed_const_1 = $.derived_safe_equal(() => {
			const {
				[`${$.get(computed_const).a}-Dimensions`]: { [$.get(computed_const).c - 1]: first },
				[`${$.get(computed_const).b}-Dimensions`]: { [$.get(computed_const).b - 1]: second },
				[`${$.get(computed_const).c}-Dimensions`]: { [$.get(computed_const).a - 1]: third }
			} = (
				$.deep_read_state($.get(length)),
				$.deep_read_state($.get(width)),
				$.deep_read_state($.get(height)),
				$.untrack(() => calculate($.get(length), $.get(width), $.get(height)))
			);

			return { first, second, third };
		});

		var p = root_1();
		var text = $.child(p);

		$.reset(p);
		$.template_effect(() => $.set_text(text, `${$.get(computed_const_1).first ?? ''}, ${$.get(computed_const_1).second ?? ''}, ${$.get(computed_const_1).third ?? ''}`));
		$.append($$anchor, p);
	});

	var node_1 = $.sibling(node, 2);

	$.await(node_1, promise2, null, void 0, ($$anchor, $$source) => {
		var $$value = $.derived_safe_equal(() => {
			var { length, width, height } = $.get($$source);

			return { length, width, height };
		});

		var length = $.derived_safe_equal(() => $.get($$value).length);
		var width = $.derived_safe_equal(() => $.get($$value).width);
		var height = $.derived_safe_equal(() => $.get($$value).height);

		const computed_const_2 = $.derived_safe_equal(() => {
			const [a, b, c] = permutation();

			return { a, b, c };
		});

		const computed_const_3 = $.derived_safe_equal(() => {
			const {
				[`${$.get(computed_const_2).a}-Dimensions`]: { [$.get(computed_const_2).c - 1]: first },
				[`${$.get(computed_const_2).b}-Dimensions`]: { [$.get(computed_const_2).b - 1]: second },
				[`${$.get(computed_const_2).c}-Dimensions`]: { [$.get(computed_const_2).a - 1]: third }
			} = (
				$.deep_read_state($.get(length)),
				$.deep_read_state($.get(width)),
				$.deep_read_state($.get(height)),
				$.untrack(() => calculate($.get(length), $.get(width), $.get(height)))
			);

			return { first, second, third };
		});

		var p_1 = root_2();
		var text_1 = $.child(p_1);

		$.reset(p_1);
		$.template_effect(() => $.set_text(text_1, `${$.get(computed_const_3).first ?? ''}, ${$.get(computed_const_3).second ?? ''}, ${$.get(computed_const_3).third ?? ''}`));
		$.append($$anchor, p_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}