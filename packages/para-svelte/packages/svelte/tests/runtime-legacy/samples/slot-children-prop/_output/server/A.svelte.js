import * as $ from 'svelte/internal/server';

export default function A($$renderer, $$props) {
	let children = $$props['children'];

	$$renderer.push(`<!---->${$.escape(children)} <!--[-->`);
	$.slot($$renderer, $$props, 'default', {}, null);
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { children });
}