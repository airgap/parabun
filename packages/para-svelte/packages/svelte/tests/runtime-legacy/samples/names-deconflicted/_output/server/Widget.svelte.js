import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let index = $$props['index'];
		let widget = $$props['widget'];

		$$renderer.push(`<p>${$.escape(index + 1)}: ${$.escape(widget.name)}</p>`);
		$.bind_props($$props, { index, widget });
	});
}