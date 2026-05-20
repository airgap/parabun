import * as $ from 'svelte/internal/server';
import { writable } from "svelte/store";
import Component from "./Component.svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let condition = $.fallback($$props['condition'], () => writable(true), true);

		if ($.store_get($$store_subs ??= {}, '$condition', condition)) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<button id="1"></button> `);
			Component($$renderer, { condition });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { condition });
	});
}