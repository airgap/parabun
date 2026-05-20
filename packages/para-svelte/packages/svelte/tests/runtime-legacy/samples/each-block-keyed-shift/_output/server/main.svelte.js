import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let titles = $$props['titles'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(titles);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let title = each_array[$$index];

		Nested($$renderer, { title: title.name });
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { titles });
}