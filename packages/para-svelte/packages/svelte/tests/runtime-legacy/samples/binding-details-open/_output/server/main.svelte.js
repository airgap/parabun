import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	$$renderer.push(`<details${$.attr('open', visible, true)}><summary>toggle</summary></details> `);

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>hello!</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}