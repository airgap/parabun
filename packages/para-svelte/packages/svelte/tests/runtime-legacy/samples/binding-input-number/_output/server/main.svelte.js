import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let count = $$props['count'];

	$$renderer.push(`<input type="number"${$.attr('value', count)}/> <p>${$.escape(typeof count)} ${$.escape(count)}</p>`);
	$.bind_props($$props, { count });
}