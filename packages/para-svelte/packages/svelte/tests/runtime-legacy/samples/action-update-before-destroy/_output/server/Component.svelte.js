import * as $ from 'svelte/internal/server';
import { afterUpdate, onDestroy } from "svelte";

export default function Component($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let id = $$props['id'];
		let items = $$props['items'];
		let item = $.store_get($$store_subs ??= {}, '$items', items)[id];
		let selected = true;

		function onClick() {
			selected = !selected;
			items.set({});
		}

		onDestroy(() => {
			console.log("onDestroy");
		});

		afterUpdate(() => {
			console.log("afterUpdate");
		});

		$$renderer.push(`<button>Click Me</button> `);

		if (selected) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<div>${$.escape(item.id)}</div>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { id, items });
	});
}