import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<svg><circle cx="50" cy="50" r="50" class="svelte-70s021"></circle><circle class="foo svelte-70s021" cx="150" cy="50" r="50"></circle><circle${$.attr_class(x, 'svelte-70s021')} cx="250" cy="50" r="50"></circle></svg>`);
	$.bind_props($$props, { x });
}