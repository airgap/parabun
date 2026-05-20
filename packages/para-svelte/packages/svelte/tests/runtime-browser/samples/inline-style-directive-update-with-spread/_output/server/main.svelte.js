import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	const $$restProps = $.rest_props($$sanitized_props, ['backgroundColor']);
	let backgroundColor = $.fallback($$props['backgroundColor'], 255);

	$$renderer.push(`<div${$.attributes({ ...$$restProps }, void 0, void 0, {
		'background-color': `rgb(${$.stringify(backgroundColor)}, 0, 0)`
	})}></div>`);

	$.bind_props($$props, { backgroundColor });
}