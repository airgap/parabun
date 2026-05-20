import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let observable = $$props['observable'];
	let visible = $$props['visible'];

	if (visible) {
		$$renderer.push('<!--[0-->');
		Nested($$renderer, { observable });
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { observable, visible });
}