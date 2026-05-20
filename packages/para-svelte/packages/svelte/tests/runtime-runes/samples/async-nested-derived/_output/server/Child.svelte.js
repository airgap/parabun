import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { count } = $$props;

		async function x() {
			let d = await $.async_derived(() => new Promise((f) => {}));
		}

		let indirect = $.derived(() => x() && count);

		$$renderer.push(`<p>${$.escape(indirect())}</p>`);
	});
}