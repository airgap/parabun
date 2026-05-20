import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];

	$$renderer.push(`<input type="checkbox"${$.attr('checked', foo, true)}/> <p>${$.escape(foo)}</p>`);
	$.bind_props($$props, { foo });
}