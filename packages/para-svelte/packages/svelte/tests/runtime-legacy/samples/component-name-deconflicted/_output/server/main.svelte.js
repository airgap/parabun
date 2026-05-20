import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let list = $.fallback($$props['list'], () => [1, 2], true);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(list);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let nested = each_array[$$index];

		if (true) {
			$$renderer.push('<!--[0-->');
			Nested($$renderer, { nested });
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { list });
}