import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let promise1 = $.fallback($$props['promise1'], () => ({ width: 3, height: 4 }), true);
	let promise2 = $.fallback($$props['promise2'], () => ({ width: 5, height: 7 }), true);
	let constant = $.fallback($$props['constant'], 10);

	function calculate(width, height, constant) {
		return {
			'the-area': width * height,
			'the-volume': width * height * constant
		};
	}

	$.await($$renderer, promise1, () => {}, ({ width, height }) => {
		const { 'the-area': area, 'the-volume': volume } = calculate(width, height, constant);
		const perimeter = (width + height) * constant;
		const { 0: _width, 1: _height, 2: sum } = [width * constant, height, width * constant + height];

		$$renderer.push(`<div>${$.escape(area)} ${$.escape(volume)} ${$.escape(perimeter)}, ${$.escape(_width)}+${$.escape(_height)}=${$.escape(sum)}</div>`);
	});

	$$renderer.push(`<!--]--> `);
	$.await($$renderer, promise2, () => {}, () => {});
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { promise1, promise2, constant });
}