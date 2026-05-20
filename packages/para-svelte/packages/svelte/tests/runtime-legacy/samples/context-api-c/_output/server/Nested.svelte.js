import * as $ from 'svelte/internal/server';
import { setContext } from 'svelte';

export default function Nested($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let value = $.fallback($$props['value'], '');

		if (value) {
			setContext('test', value);
		}

		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'default', {}, null);
		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { value });
	});
}