import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	// bind:clientHeight on the parent is not really part of the test, just here for forwarding the value
	let clientHeight = $$props['clientHeight'];

	$$renderer.push(`<p><!--[-->`);
	$.slot($$renderer, $$props, 'default', {}, null);
	$$renderer.push(`<!--]--></p>`);
	$.bind_props($$props, { clientHeight });
}