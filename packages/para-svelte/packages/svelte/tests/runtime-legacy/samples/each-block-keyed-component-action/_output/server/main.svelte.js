import * as $ from 'svelte/internal/server';
import Component from "./Component.svelte";

export default function Main($$renderer, $$props) {
	let arr = $.fallback($$props['arr'], () => [], true);
	let count = $.fallback($$props['count'], 0);

	function action(node, params) {
		count += 1;

		return {
			destroy() {
				count -= 1;
			}
		};
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(arr);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		Component($$renderer, { action });
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { arr, count });
}