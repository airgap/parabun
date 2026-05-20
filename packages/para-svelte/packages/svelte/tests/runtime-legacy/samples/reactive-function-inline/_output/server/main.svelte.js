import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let list = [0, 1, 2, 3, 4];
	let selected = $.fallback($$props['selected'], 0);

	$$renderer.push(`<p>${$.escape(list.filter((x) => x === selected))}</p>`);
	$.bind_props($$props, { selected });
}