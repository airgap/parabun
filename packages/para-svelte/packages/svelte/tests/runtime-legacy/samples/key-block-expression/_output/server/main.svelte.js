import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], 0);
	let anotherValue = $.fallback($$props['anotherValue'], 0);
	let thirdValue = $.fallback($$props['thirdValue'], 0);

	$$renderer.push(`<!---->`);

	{
		$$renderer.push(`<div>${$.escape(value)}${$.escape(anotherValue)}${$.escape(thirdValue)}</div>`);
	}

	$$renderer.push(`<!---->`);
	$.bind_props($$props, { value, anotherValue, thirdValue });
}