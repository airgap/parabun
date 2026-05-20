import * as $ from 'svelte/internal/server';
import { tick } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let refs = [];

		function addItem() {
			refs = refs.concat({ ref: null });

			return tick();
		}

		let callback = $$props['callback'];

		$: callback(refs);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(refs);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let xxx = each_array[$$index];

			$$renderer.push(`<div></div>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { callback, addItem });
	});
}