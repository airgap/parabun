import * as $ from 'svelte/internal/server';
import { beforeUpdate } from 'svelte';

export default function Item($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let item = $$props['item'];
		let foo = $.fallback($$props['foo'], 'XX');

		beforeUpdate(() => {
			foo = item;
		});

		$$renderer.push(`<span>${$.escape(foo)}</span>`);
		$.bind_props($$props, { item, foo });
	});
}