import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const $$slots = $.sanitize_slots($$props);

	$$renderer.component(($$renderer) => {
		let nums = $.fallback($$props['nums'], () => [1, 2, 3], true);

		let foos = [
			{ nums: [1, 2, 3] },
			{ nums: [0, 2, 4] },
			{ nums: [-100, 0, 100] }
		];

		let default_nums = [-1];
		let foo = "dummy-foo";
		let num = "dummy-num";

		$$renderer.push(`<p>foo: dummy-foo, num: dummy-num</p> <!--[-->`);

		const each_array = $.ensure_array_like(nums);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let num = each_array[$$index];

			const bar = foos.map((foo) => foo.nums.filter((num) => {
				if (Object.keys($$slots).length) {
					return false;
				} else if (Object.keys(foo).length) {
					return nums.includes(num) || default_nums.includes(num);
				} else {
					return false;
				}
			}) || num);

			$$renderer.push(`<p>bar: ${$.escape(bar)}, num: ${$.escape(num)}</p>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { nums });
	});
}