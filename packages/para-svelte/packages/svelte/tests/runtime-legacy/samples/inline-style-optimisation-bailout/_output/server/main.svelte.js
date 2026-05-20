import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let styles = $.fallback($$props['styles'], () => `color: red;`, true);

	$$renderer.push(`<p${$.attr_style(`opacity: 0.5; ${$.stringify(styles)}`)}>${$.escape(styles)}</p>`);
	$.bind_props($$props, { styles });
}