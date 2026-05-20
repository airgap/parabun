import * as $ from 'svelte/internal/server';
import { getContext, setContext } from 'svelte';

export default function Nested($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let name = $.fallback($$props['name'], '');
		const parentName = getContext('test');

		setContext('test', parentName ? parentName + '/' + name : name);
		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'default', {}, null);
		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { name });
	});
}