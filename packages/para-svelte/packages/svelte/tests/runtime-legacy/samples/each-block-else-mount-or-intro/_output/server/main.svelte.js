import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let items = $$props['items'];
	const each_array = $.ensure_array_like(items);

	if (each_array.length !== 0) {
		$$renderer.push('<!--[-->');

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			Widget($$renderer, { item });
		}
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push(`<!---->No items.`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { items });
}