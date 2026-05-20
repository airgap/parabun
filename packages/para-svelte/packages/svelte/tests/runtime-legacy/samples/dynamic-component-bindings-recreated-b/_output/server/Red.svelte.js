import * as $ from 'svelte/internal/server';

export default function Red($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], 'red');

	$$renderer.push(`<p>red ${$.escape(foo)}</p>`);
	$.bind_props($$props, { foo });
}