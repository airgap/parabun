import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let boxes = $.fallback(
		$$props['boxes'],
		() => [
			{ width: 3, height: 4 },
			{ width: 5, height: 7 },
			{ width: 6, height: 8 }
		],
		true
	);

	let constant = $.fallback($$props['constant'], 10);

	function calculate(width, height, constant) {
		return {
			'the-area': width * height,
			'the-volume': width * height * constant
		};
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(boxes);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let { width, height } = each_array[$$index];
		const { 'the-area': area, 'the-volume': volume } = calculate(width, height, constant);
		const perimeter = (width + height) * constant;
		const { 2: sum, 0: _width, 1: _height } = [width * constant, height, width * constant + height];

		$$renderer.push(`<div>${$.escape(area)} ${$.escape(volume)} ${$.escape(perimeter)}, ${$.escape(_width)}+${$.escape(_height)}=${$.escape(sum)}</div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { boxes, constant });
}