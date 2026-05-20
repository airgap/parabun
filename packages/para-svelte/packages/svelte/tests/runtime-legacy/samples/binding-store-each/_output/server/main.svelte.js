import * as $ from 'svelte/internal/server';
import { derived, writable } from "svelte/store";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		const checks = writable([false, false, false]);
		const countChecked = derived(checks, ($checks) => $checks.filter(Boolean).length);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like($.store_get($$store_subs ??= {}, '$checks', checks));

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let checked = each_array[$$index];

			$$renderer.push(`<input type="checkbox"${$.attr('checked', checked, true)}/>`);
		}

		$$renderer.push(`<!--]--> ${$.escape($.store_get($$store_subs ??= {}, '$countChecked', countChecked))}`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);
	});
}