import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], 'foo');
	let bar = $$props['bar'];

	$$renderer.push(`<!---->${$.escape(JSON.stringify(foo))}
${$.escape(JSON.stringify(bar))}`);

	$.bind_props($$props, { foo, bar });
}