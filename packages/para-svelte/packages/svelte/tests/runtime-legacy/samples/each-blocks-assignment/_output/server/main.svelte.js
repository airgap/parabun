import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let obj = { prop: "foo" };
	let arr = [1, 2, 3];

	$$renderer.push(`<button>Add</button> <!--[-->`);

	const each_array = $.ensure_array_like(arr);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let o = each_array[$$index];

		$$renderer.push(`<span class="content">${$.escape(o)}</span> <button>Test</button>`);
	}

	$$renderer.push(`<!--]-->`);
}