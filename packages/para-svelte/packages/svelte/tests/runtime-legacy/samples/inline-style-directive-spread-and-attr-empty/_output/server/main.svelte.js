import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let spread = $.fallback($$props['spread'], () => ({ style: 'color: red;' }), true);
	let color = $.fallback($$props['color'], null);
	let style = $.fallback($$props['style'], 'color: blue');

	$$renderer.push(`<p${$.attributes({ ...spread, style }, void 0, void 0, { color })}></p>`);
	$.bind_props($$props, { spread, color, style });
}