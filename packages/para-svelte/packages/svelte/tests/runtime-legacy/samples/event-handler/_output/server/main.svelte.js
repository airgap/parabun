import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	$$renderer.push(`<button>toggle</button> `);

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>hello!</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}