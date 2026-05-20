import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	let name = $$props['name'];

	$: console.log('name in child: ' + name);

	$$renderer.push(`<p>welcome, dan</p>`);
	$.bind_props($$props, { name });
}