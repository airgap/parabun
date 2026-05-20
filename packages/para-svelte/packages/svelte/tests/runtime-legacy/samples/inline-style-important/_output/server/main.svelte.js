import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let color = $.fallback($$props['color'], () => `red`, true);

	$$renderer.push(`<p${$.attr_style(`color: ${$.stringify(color)} !important; font-size: 20px !important; opacity: 1;`)} class="svelte-70s021">${$.escape(color)}</p>`);
	$.bind_props($$props, { color });
}