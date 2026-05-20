import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<p></p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let nums = $.prop($$props, 'nums', 28, () => [1, 2]);

	let foos = [
		{ nums: [1, 2, 3] },
		{ nums: [0, 2, 4] },
		{ nums: [-100, 0, 100] }
	];

	let foo = 0;

	var $$exports = {
		get nums() {
			return nums();
		},

		set nums($$value) {
			nums($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);

	p.textContent = '0';

	var node = $.sibling(p, 2);

	$.each(node, 1, nums, $.index, ($$anchor, num, index) => {
		const bar = $.derived_safe_equal(() => (
			$.deep_read_state(nums()),
			index,
			$.untrack(() => nums().map((num) => {
				const func = (foos, num) => {
					return [...foos.map((foo) => foo), num];
				};

				return func(foos[index].nums, num);
			}))
		));

		var p_1 = root_1();
		var text = $.child(p_1);

		$.reset(p_1);
		$.template_effect(() => $.set_text(text, `bar: ${$.get(bar) ?? ''}, num: ${$.get(num) ?? ''}`));
		$.append($$anchor, p_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}