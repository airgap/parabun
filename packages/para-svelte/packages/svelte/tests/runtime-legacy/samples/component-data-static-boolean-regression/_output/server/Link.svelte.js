import * as $ from 'svelte/internal/server';

export default function Link($$renderer, $$props) {
	let href = $$props['href'];

	$$renderer.push(`<a${$.attr('href', href)}>link</a>`);
	$.bind_props($$props, { href });
}