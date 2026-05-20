import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];
	let clicked = $$props['clicked'];
	let bar = $$props['bar'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(foo);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let f = each_array[$$index];

		$$renderer.push(`<button>foo</button>`);
	}

	$$renderer.push(`<!--]--> <!--[-->`);

	const each_array_1 = $.ensure_array_like(bar);

	for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
		let b = each_array_1[$$index_1];

		$$renderer.push(`<button>bar</button>`);
	}

	$$renderer.push(`<!--]--> <p>clicked: ${$.escape(clicked)}</p>`);
	$.bind_props($$props, { foo, clicked, bar });
}