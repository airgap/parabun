import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], 0);
	let reactive = $.fallback($$props['reactive'], 0);

	$$renderer.push(`<!---->`);

	{
		$$renderer.push(`<div>${$.escape(value)}</div>`);
	}

	$$renderer.push(`<!----> <div>${$.escape(reactive)}</div>`);
	$.bind_props($$props, { value, reactive });
}