import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], () => ({ bar: 5 }), true);

	$$renderer.push(`<h1 class="svelte-9w8ujg">multiple ${$.escape(foo)}</h1>`);
	$.bind_props($$props, { foo });
}