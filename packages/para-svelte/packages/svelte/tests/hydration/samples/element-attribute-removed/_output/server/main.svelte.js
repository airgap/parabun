import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let id = $$props['id'];

	$$renderer.push(`<div${$.attr('id', id)}></div> `);

	if (true) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div${$.attr('id', id)}></div> <div${$.attr('id', id)}></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { id });
}