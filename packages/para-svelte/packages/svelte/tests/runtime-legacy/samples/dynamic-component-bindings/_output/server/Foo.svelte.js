import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	let y = $$props['y'];

	$$renderer.push(`<p>foo</p> <input${$.attr('value', y)}/>`);
	$.bind_props($$props, { y });
}