import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let data = $.fallback($$props['data'], 'this should not appear');

	$$renderer.push(`<p><!--[-->`);
	$.slot($$renderer, $$props, 'default', {}, null);
	$$renderer.push(`<!--]--></p>`);
	$.bind_props($$props, { data });
}