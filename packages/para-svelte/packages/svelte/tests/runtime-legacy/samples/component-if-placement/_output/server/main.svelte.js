import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

export default function Main($$renderer, $$props) {
	let flag = $$props['flag'];

	$$renderer.push(`<span>Before</span> `);

	if (flag) {
		$$renderer.push('<!--[0-->');
		Component($$renderer, {});
	} else {
		$$renderer.push('<!--[-1-->');
		Component($$renderer, {});
	}

	$$renderer.push(`<!--]--> <span>After</span>`);
	$.bind_props($$props, { flag });
}