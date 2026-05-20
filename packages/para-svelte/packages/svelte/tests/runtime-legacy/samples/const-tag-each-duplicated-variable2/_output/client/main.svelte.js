import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<p></p> <!>`, 1);

export default function Main($$anchor, $$props) {
	const $$slots = $.sanitize_slots($$props);

	$.push($$props, false);

	let nums = $.prop($$props, 'nums', 28, () => [1, 2, 3]);

	let foos = [
		{ nums: [1, 2, 3] },
		{ nums: [0, 2, 4] },
		{ nums: [-100, 0, 100] }
	];

	let default_nums = [-1];
	let foo = "dummy-foo";
	let num = "dummy-num";

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

	p.textContent = 'foo: dummy-foo, num: dummy-num';

	var node = $.sibling(p, 2);

	$.each(node, 1, nums, $.index, ($$anchor, num, $$index, $$array) => {
		const bar = $.derived_safe_equal(() => (
			$.deep_read_state(nums()),
			$.get(num),
			$.untrack(() => foos.map((foo) => foo.nums.filter((num) => {
				if (Object.keys($$slots).length) {
					return false;
				} else if (Object.keys(foo).length) {
					return nums().includes(num) || default_nums.includes(num);
				} else {
					return false;
				}
			}) || $.get(num)))
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