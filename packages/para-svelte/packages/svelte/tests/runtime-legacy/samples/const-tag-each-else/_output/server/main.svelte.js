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
		return { area: width * height, volume: width * height * constant };
	}

	const each_array = $.ensure_array_like(boxes);

	if (each_array.length !== 0) {
		$$renderer.push('<!--[-->');

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let box = each_array[$$index];
			const { area, volume } = calculate(box.width, box.height, constant);
			const perimeter = (box.width + box.height) * constant;

			const [width, height, sum] = [
				box.width * constant,
				box.height,
				box.width * constant + box.height
			];

			$$renderer.push(`<div>${$.escape(area)} ${$.escape(volume)} ${$.escape(perimeter)}, ${$.escape(width)}+${$.escape(height)}=${$.escape(sum)}</div>`);
		}
	} else {
		$$renderer.push('<!--[!-->');

		const double = constant + constant;

		$$renderer.push(`<div>${$.escape(constant)} * 2 = ${$.escape(double)}</div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { boxes, constant });
}