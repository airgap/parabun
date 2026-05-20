import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], true);

	if (foo) {
		$$renderer.push('<!--[0-->');
		Component($$renderer, {});
	} else {
		$$renderer.push('<!--[-1-->');
		Component($$renderer, {});
	}

	$$renderer.push(`<!--]--> `);

	if (foo) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<div></div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { foo });
}