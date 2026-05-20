import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let snapshot = $$props['snapshot'];
	let foo = $$props['foo'];
	let a = $$props['a'];

	function baz(a) {
		snapshot = a;
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(foo);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let bar = each_array[$$index];

		$$renderer.push(`<button>click me</button>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { snapshot, foo, a, baz });
}