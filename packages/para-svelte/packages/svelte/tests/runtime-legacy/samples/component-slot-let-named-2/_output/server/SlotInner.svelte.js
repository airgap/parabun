import * as $ from 'svelte/internal/server';

export default function SlotInner($$renderer, $$props) {
	let thing = $$props['thing'];

	$$renderer.push(`<span>${$.escape(thing)}</span> <!--[-->`);
	$.slot($$renderer, $$props, 'default', {}, null);
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { thing });
}