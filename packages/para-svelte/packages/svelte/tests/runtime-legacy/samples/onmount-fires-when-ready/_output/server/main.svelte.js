import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];

	$$renderer.push(`<div>`);
	Widget($$renderer, {});
	$$renderer.push(`<!----> `);

	if (foo) {
		$$renderer.push('<!--[0-->');
		Widget($$renderer, {});
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { foo });
}