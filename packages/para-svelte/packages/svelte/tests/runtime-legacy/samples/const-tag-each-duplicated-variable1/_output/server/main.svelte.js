import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let nums = $.fallback($$props['nums'], () => [1, 2, 3], true);

	let foos = [
		{ nums: [1, 2, 3] },
		{ nums: [0, 2, 4] },
		{ nums: [-100, 0, 100] }
	];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(nums);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let num = each_array[$$index];
		const bar = foos.map((foos) => foos.nums);

		$$renderer.push(`<p>bar: ${$.escape(bar)}, num: ${$.escape(num)}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { nums });
}