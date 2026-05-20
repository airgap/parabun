import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let name = $$props['name'];

	console.log(name);
	$$renderer.push(`<main class="svelte-uvohi4"><div>${$.escape(name)}</div></main>`);
	$.bind_props($$props, { name });
}