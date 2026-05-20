import * as $ from 'svelte/internal/server';

export default function Component($$renderer, $$props) {
	let value = $$props['value'];
	let value2 = $$props['value2'];

	$$renderer.push(`<!---->${$.escape(value)}${$.escape(value2)}`);
	$.bind_props($$props, { value, value2 });
}