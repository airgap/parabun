import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

export default function Main($$renderer, $$props) {
	let box = $.fallback($$props['box'], () => ({ width: 3, height: 4 }), true);
	let constant = $.fallback($$props['constant'], 10);

	function calculate(width, height, constant) {
		return { area: width * height, volume: width * height * constant };
	}

	Component($$renderer, {
		box,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { box: { width, height } }) => {
				{
					const { area, volume } = calculate(width, height, constant);
					const perimeter = (width + height) * constant;
					const [_width, _height, sum] = [width * constant, height, width * constant + height];

					$$renderer.push(`<div>${$.escape(area)} ${$.escape(volume)} ${$.escape(perimeter)}, ${$.escape(_width)}+${$.escape(_height)}=${$.escape(sum)}</div>`);
				}
			},

			box1: ($$renderer, { box }) => {
				{
					const { area, volume } = calculate(box.width, box.height, constant);
					const perimeter = (box.width + box.height) * constant;

					const [width, height, sum] = [
						box.width * constant,
						box.height,
						box.width * constant + box.height
					];

					$$renderer.push(`<div>${$.escape(area)} ${$.escape(volume)} ${$.escape(perimeter)}, ${$.escape(width)}+${$.escape(height)}=${$.escape(sum)}</div>`);
				}
			},

			box2: ($$renderer, { width, height }) => {
				{
					const { area, volume } = calculate(width, height, constant);
					const perimeter = (width + height) * constant;
					const [_width, _height, sum] = [width * constant, height, width * constant + height];

					$$renderer.push(`<div>${$.escape(area)} ${$.escape(volume)} ${$.escape(perimeter)}, ${$.escape(_width)}+${$.escape(_height)}=${$.escape(sum)}</div>`);
				}
			}
		}
	});

	$$renderer.push(`<!----> `);

	Component($$renderer, {
		box,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { box }) => {
				const { area, volume } = calculate(box.width, box.height, constant);
				const perimeter = (box.width + box.height) * constant;

				const [width, height, sum] = [
					box.width * constant,
					box.height,
					box.width * constant + box.height
				];

				$$renderer.push(`<div>${$.escape(area)} ${$.escape(volume)} ${$.escape(perimeter)}, ${$.escape(width)}+${$.escape(height)}=${$.escape(sum)}</div>`);
			},

			box1: ($$renderer, { box }) => {
				const { area, volume } = calculate(box.width, box.height, constant);
				const perimeter = (box.width + box.height) * constant;

				const [width, height, sum] = [
					box.width * constant,
					box.height,
					box.width * constant + box.height
				];

				$$renderer.push(`<div slot="box1"><div>${$.escape(area)} ${$.escape(volume)} ${$.escape(perimeter)}, ${$.escape(width)}+${$.escape(height)}=${$.escape(sum)}</div></div>`);
			},

			box2: ($$renderer, { width, height }) => {
				const { area, volume } = calculate(width, height, constant);
				const perimeter = (width + height) * constant;
				const [_width, _height, sum] = [width * constant, height, width * constant + height];

				$$renderer.push(`<div slot="box2"><div>${$.escape(area)} ${$.escape(volume)} ${$.escape(perimeter)}, ${$.escape(_width)}+${$.escape(_height)}=${$.escape(sum)}</div></div>`);
			}
		}
	});

	$$renderer.push(`<!----> `);

	Component($$renderer, {
		box,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { box: { width, height } }) => {
				const { area, volume } = calculate(width, height, constant);
				const perimeter = (width + height) * constant;
				const [_width, _height, sum] = [width * constant, height, width * constant + height];

				$$renderer.push(`<div>${$.escape(area)} ${$.escape(volume)} ${$.escape(perimeter)}, ${$.escape(_width)}+${$.escape(_height)}=${$.escape(sum)}</div>`);
			}
		}
	});

	$$renderer.push(`<!---->`);
	$.bind_props($$props, { box, constant });
}