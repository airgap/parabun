import * as $ from 'svelte/internal/server';

export default function Green($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], 'green');

	$$renderer.push(`<p>green ${$.escape(foo)}</p>`);
	$.bind_props($$props, { foo });
}