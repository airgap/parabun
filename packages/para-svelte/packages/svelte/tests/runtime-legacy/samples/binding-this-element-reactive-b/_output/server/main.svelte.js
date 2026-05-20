import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $.fallback($$props['visible'], true);
	let h1;

	$$renderer.push(`<div>The text is ${$.escape(h1 ? h1.textContent : 'missing')}</div> `);

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<h1>hello</h1>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}