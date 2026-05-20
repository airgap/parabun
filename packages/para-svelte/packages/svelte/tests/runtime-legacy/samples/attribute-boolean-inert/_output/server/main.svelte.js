import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let inert = $$props['inert'];

	$$renderer.push(`<div${$.attr('inert', false, true)}></div> <div${$.attr('inert', inert, true)}>some div <button>click</button></div>`);
	$.bind_props($$props, { inert });
}