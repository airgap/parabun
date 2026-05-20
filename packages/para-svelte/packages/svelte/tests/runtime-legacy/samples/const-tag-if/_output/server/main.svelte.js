import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let boxes = $$props['boxes'];

		if (boxes.length > 0) {
			$$renderer.push('<!--[0-->');

			const box = boxes[0];
			const { width, height } = box;

			$$renderer.push(`<div>${$.escape(width)} x ${$.escape(height)}</div>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { boxes });
	});
}