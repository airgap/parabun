import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $$props['value'];
	let props = $$props['props'];

	$$renderer.push(`<input${$.attributes({ value, ...props }, void 0, void 0, void 0, 4)}/>`);
	$.bind_props($$props, { value, props });
}