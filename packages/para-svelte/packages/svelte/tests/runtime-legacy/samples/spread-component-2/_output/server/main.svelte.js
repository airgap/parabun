import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let list = $$props['list'];
	let qux = $.fallback($$props['qux'], 0);

	$$renderer.push(`<div><!--[-->`);

	const each_array = $.ensure_array_like(list);

	for (let index = 0, $$length = each_array.length; index < $$length; index++) {
		let item = each_array[index];

		Widget($$renderer, $.spread_props([item, { qux, selected: qux === index }]));
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { list, qux });
}