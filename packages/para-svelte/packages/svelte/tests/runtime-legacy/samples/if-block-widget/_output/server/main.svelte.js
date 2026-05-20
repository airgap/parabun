import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	$$renderer.push(`<!---->before `);

	if (visible) {
		$$renderer.push('<!--[0-->');
		Widget($$renderer, {});
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> after`);
	$.bind_props($$props, { visible });
}