import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let nums = $.prop($$props, 'nums', 28, () => [1, 2, 3]);

	let foos = [
		{ nums: [1, 2, 3] },
		{ nums: [0, 2, 4] },
		{ nums: [-100, 0, 100] }
	];

	var $$exports = {
		get nums() {
			return nums();
		},

		set nums($$value) {
			nums($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, nums, $.index, ($$anchor, num) => {
		const bar = $.derived_safe_equal(() => ($.untrack(() => foos.map((foos) => foos.nums))));
		var p = root_1();
		var text = $.child(p);

		$.reset(p);
		$.template_effect(() => $.set_text(text, `bar: ${$.get(bar) ?? ''}, num: ${$.get(num) ?? ''}`));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}