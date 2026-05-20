import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let color = $.fallback($$props['color'], 'blue');
	let obj = $.fallback($$props['obj'], () => ({ id: 'my-id', style: 'width: 65px' }), true);

	$$renderer.push(`<p${$.attributes({ ...obj }, void 0, void 0, { color })}></p>`);
	$.bind_props($$props, { color, obj });
}