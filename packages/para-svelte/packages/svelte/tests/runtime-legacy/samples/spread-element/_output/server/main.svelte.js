import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let props = $.fallback($$props['props'], () => ({ 'data-foo': 'bar', 'data-named': 'qux' }), true);
	let color = $.fallback($$props['color'], 'red');

	$$renderer.push(`<div${$.attributes({ ...props, 'data-named': 'value' })}>${$.escape(color)}</div>`);
	$.bind_props($$props, { props, color });
}