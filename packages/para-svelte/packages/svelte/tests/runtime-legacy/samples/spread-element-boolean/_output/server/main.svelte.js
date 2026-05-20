import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let props = $$props['props'];

	$$renderer.push(`<button${$.attributes({ ...props })}>click me</button>`);
	$.bind_props($$props, { props });
}