import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function ParentWidget($$renderer, $$props) {
	let foo = $$props['foo'];

	Widget($$renderer, {});
	$$renderer.push(`<!---->`);

	if (foo) {
		$$renderer.push('<!--[0-->');
		Widget($$renderer, {});
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { foo });
}