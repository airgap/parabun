import * as $ from 'svelte/internal/server';

export default function Thing($$renderer, $$props) {
	let thing = $$props['thing'];

	$$renderer.push(`<p>${$.escape(thing)}</p>`);
	$.bind_props($$props, { thing });
}