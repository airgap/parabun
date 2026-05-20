import * as $ from 'svelte/internal/server';
import Component from "./Component.svelte";

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	$$renderer.push(`<div>toggle</div> `);
	Component($$renderer, {});
	$$renderer.push(`<!----> `);

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>hello!</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}