import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let boxes = $.fallback(
		$$props['boxes'],
		() => [
			{ length: 2, width: 3, height: 4 },
			{ length: 9, width: 5, height: 7 },
			{ length: 10, width: 6, height: 8 }
		],
		true
	);

	function calculate(length, width, height) {
		return {
			twoDimensions: {
				bottomArea: length * width,
				sideArea1: width * height,
				sideArea2: length * height
			},
			threeDimensions: { volume: length * width * height }
		};
	}

	let dimension = $.fallback($$props['dimension'], 'Dimensions');

	function changeDimension() {
		dimension = 'DIMENSIONS';
	}

	let area = 'Area';
	let th = 'th';

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(boxes);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let { [`leng${th}`]: length, [`wid${th}`]: width, height } = each_array[$$index];

		const {
			[`two${dimension}`]: areas,
			[`three${dimension}`]: { volume }
		} = calculate(length, width, height);

		const {
			i = 1,
			[`bottom${area}`]: bottom,
			[`side${area}${i}`]: sideone,
			[`side${area}${i + 1}`]: sidetwo
		} = areas;

		$$renderer.push(`<button>${$.escape(bottom)}, ${$.escape(sideone)}, ${$.escape(sidetwo)}, ${$.escape(volume)}</button>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { boxes, dimension });
}