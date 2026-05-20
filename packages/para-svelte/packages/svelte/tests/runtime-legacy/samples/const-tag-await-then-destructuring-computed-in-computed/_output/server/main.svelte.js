import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let promise1 = $.fallback($$props['promise1'], () => ({ length: 5, width: 3, height: 4 }), true);
	let promise2 = $.fallback($$props['promise2'], () => ({ length: 12, width: 5, height: 13 }), true);
	let permutation = $.fallback($$props['permutation'], () => [1, 2, 3], true);

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

	const th = 'th';

	$.await($$renderer, promise1, () => {}, ({ length, width, height }) => {
		const { [0]: a, [1]: b, [2]: c } = permutation;

		const {
			[`${a}-Dimensions`]: { [c - 1]: first },
			[`${b}-Dimensions`]: { [b - 1]: second },
			[`${c}-Dimensions`]: { [a - 1]: third }
		} = calculate(length, width, height);

		$$renderer.push(`<p>${$.escape(first)}, ${$.escape(second)}, ${$.escape(third)}</p>`);
	});

	$$renderer.push(`<!--]--> `);
	$.await($$renderer, promise2, () => {}, () => {});
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { promise1, promise2, permutation });
}