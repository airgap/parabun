import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let nums = $.fallback($$props['nums'], () => [1, 2], true);

		let foos = [
			{ nums: [1, 2, 3] },
			{ nums: [0, 2, 4] },
			{ nums: [-100, 0, 100] }
		];

		let foo = 0;

		$$renderer.push(`<p>0</p> <!--[-->`);

		const each_array = $.ensure_array_like(nums);

		for (let index = 0, $$length = each_array.length; index < $$length; index++) {
			let num = each_array[index];

			const bar = nums.map((num) => {
				const func = (foos, num) => {
					return [...foos.map((foo) => foo), num];
				};

				return func(foos[index].nums, num);
			});

			$$renderer.push(`<p>bar: ${$.escape(bar)}, num: ${$.escape(num)}</p>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { nums });
	});
}