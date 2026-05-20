import * as $ from 'svelte/internal/server';

export default function Svg($$renderer, $$props) {
	let id = $$props['id'];

	$$renderer.push(`<g${$.attr('id', id)}><circle cx="50" cy="50" r="10" class="svelte-gkxv5"></circle><rect width="100" height="100" class="svelte-gkxv5"></rect></g>`);
	$.bind_props($$props, { id });
}