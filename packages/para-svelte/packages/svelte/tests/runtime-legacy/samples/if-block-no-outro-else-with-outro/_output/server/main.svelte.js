import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];
	let x = $.fallback($$props['x'], 'x');

	if (foo) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>foo</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
		Widget($$renderer, {});
		$$renderer.push(`<!----> <p>${$.escape(x)}</p> <input type="text"${$.attr('value', x)}/>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { foo, x });
}