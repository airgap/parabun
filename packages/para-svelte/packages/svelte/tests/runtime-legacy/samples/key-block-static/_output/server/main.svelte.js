import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = 0;
	let anotherValue = $.fallback($$props['anotherValue'], 0);

	$$renderer.push(`<!---->`);

	{
		$$renderer.push(`<div>0${$.escape(anotherValue)}</div>`);
	}

	$$renderer.push(`<!---->`);
	$.bind_props($$props, { anotherValue });
}