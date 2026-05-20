import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	var // static
		color,
		// dynamic
		width;

	var $$promises = $$renderer.run([
		() => Promise.resolve(),
		() => {
			color = 'red';
			width = '100px';
		}
	]);

	$$renderer.async_block([$$promises[1]], ($$renderer) => {
		if (color) {
			$$renderer.push('<!--[0-->');

			$$renderer.async([$$promises[1]], ($$renderer) => {
				$$renderer.push(`<div${$.attr_style('', { color })}></div>`);
			});

			$$renderer.push(` `);

			$$renderer.async([$$promises[1]], ($$renderer) => {
				$$renderer.push(`<div${$.attr_style('', { width })}></div>`);
			});

			$$renderer.push(` <button>width</button>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}
	});

	$$renderer.push(`<!--]--> `);

	$$renderer.async_block([$$promises[1]], ($$renderer) => {
		if (color) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<div${$.attr_style('', { color })}></div> <div${$.attr_style('', { width })}></div> <button>width</button>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}
	});

	$$renderer.push(`<!--]-->`);
}