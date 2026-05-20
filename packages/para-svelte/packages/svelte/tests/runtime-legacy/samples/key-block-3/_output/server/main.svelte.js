import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], 0);

	$$renderer.push(`<!---->`);

	{
		$$renderer.push(`<div></div>`);
	}

	$$renderer.push(`<!---->`);
	$.bind_props($$props, { value });
}