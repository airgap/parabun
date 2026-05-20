import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	let onclick = $$props['onclick'];

	$$renderer.push(`<button><!--[-->`);
	$.slot($$renderer, $$props, 'default', {}, null);
	$$renderer.push(`<!--]--></button>`);
	$.bind_props($$props, { onclick });
}