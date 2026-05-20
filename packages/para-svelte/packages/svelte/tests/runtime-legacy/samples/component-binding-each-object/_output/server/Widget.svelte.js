import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let value = $$props['value'];

		$$renderer.push(`<span>${$.escape(value.id)}</span>`);
		$.bind_props($$props, { value });
	});
}