import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let name = $$props['name'];

	$$renderer.push(`<input${$.attr('value', name)}/> <p>Hello ${$.escape(name)}!</p>`);
	$.bind_props($$props, { name });
}