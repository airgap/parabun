import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let value = $$props['value'];

		$$renderer.push(`<input${$.attr('value', value.name)}/>`);
		$.bind_props($$props, { value });
	});
}