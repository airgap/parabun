import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let obj = { prop: "foo" };
	let arr = $.fallback($$props['arr'], () => [obj], true);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(arr);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let o = each_array[$$index];

		$$renderer.push(`<span class="content">${$.escape(o.prop)}</span> <button>Test</button>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { arr });
}