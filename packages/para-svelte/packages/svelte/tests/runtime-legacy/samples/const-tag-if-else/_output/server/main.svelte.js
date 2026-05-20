import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let boxes = $$props['boxes'];

		if (boxes.length === 2) {
			$$renderer.push('<!--[0-->');

			const box1 = boxes[0];
			const box2 = boxes[1];
			const { width, height } = box1;

			$$renderer.push(`<div>${$.escape(width)} x ${$.escape(height)}</div> <div>${$.escape(box2.width)} x ${$.escape(box2.height)}</div>`);
		} else if (boxes.length === 1) {
			$$renderer.push('<!--[1-->');

			const box = boxes[0];
			const { width, height } = box;

			$$renderer.push(`<div>${$.escape(width)} x ${$.escape(height)}</div>`);
		} else {
			$$renderer.push('<!--[-1-->');

			const length = boxes.length;

			$$renderer.push(`<div>${$.escape(length)}</div>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { boxes });
	});
}